import fs from 'node:fs'
import crypto from 'node:crypto'
import { execSync } from 'node:child_process'

function main() {
  const out = execSync('npm pack --json').toString()
  const info = JSON.parse(out)
  const pack = Array.isArray(info) ? info[0] : info
  const tar = pack.filename
  const hash = crypto.createHash('sha256').update(fs.readFileSync(tar)).digest('hex')
  const prov = {
    _type: 'https://in-toto.io/Statement/v0.1',
    subject: [{ name: tar, digest: { sha256: hash } }],
    predicateType: 'https://slsa.dev/provenance/v1'
  }
  const provString = JSON.stringify(prov, null, 2)

  // Generate keys
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  })
  
  // DSSE PAE
  const payloadType = 'application/vnd.in-toto+json'
  const pae = `DSSEv1 ${payloadType.length} ${payloadType} ${Buffer.byteLength(provString)} ${provString}`
  
  // Sign
  const signer = crypto.createSign('sha256')
  signer.update(pae)
  const signature = signer.sign(privateKey, 'base64')

  const envelope = {
    payloadType,
    payload: Buffer.from(provString).toString('base64'),
    signatures: [{ sig: signature }]
  }

  fs.writeFileSync('provenance.json', JSON.stringify(envelope, null, 2))
  fs.writeFileSync('provenance.pub', publicKey)
  fs.writeFileSync('provenance.sig', signature)

  console.log('Generated DSSE envelope provenance.json, provenance.pub, and provenance.sig')
}

main()
