import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import ignore, { type Ignore } from 'ignore'
import type { DidChangeWatchedFilesParams } from 'vscode-languageserver'
import { inferFilePath } from './utils'

export default class FileFilter {
  ig: Ignore | null = null

  constructor() {
    this.reload()
  }

  reload(params?: DidChangeWatchedFilesParams) {
    if (params) {
      if (params.changes.findIndex(item => item.uri.endsWith('.zhlintignore')) === -1)
        return
    }

    const file = resolve('.', '.zhlintignore')
    if (existsSync(file)) {
      const content = readFileSync(file, 'utf-8')
      console.log('filter content', content)
      this.ig = ignore().add(content)
    }
    else {
      this.ig = null
    }
  }

  ignores(uri: string) {
    const fileName = inferFilePath(uri)
    const dir = resolve('.')
    if (fileName) {
      const name = relative(dir, fileName)
      console.log('resolve ignore', name)
      if (this.ig)
        return this.ig.ignores(name)
    }
    return false
  }
}
