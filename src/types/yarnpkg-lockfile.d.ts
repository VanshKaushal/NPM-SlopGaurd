declare module '@yarnpkg/lockfile' {
  export interface LockFileEntry {
    version: string
    resolved?: string
    integrity?: string
    checksum?: string
    resolution?: string
    dependencies?: Record<string, string>
  }
  export interface LockFile {
    type: 'success' | 'merge' | 'conflict'
    object: Record<string, LockFileEntry>
  }
  export function parse(content: string): LockFile
}
