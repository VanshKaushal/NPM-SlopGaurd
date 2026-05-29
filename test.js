const { parse } = require('@yarnpkg/lockfile')

const berry = `
__metadata:
  version: 6
  cacheKey: 8

"lodash@npm:4.17.21":
  version: 4.17.21
  resolution: "lodash@npm:4.17.21"
  dependencies:
    foo: 1.0.0
`
console.log(parse(berry))
