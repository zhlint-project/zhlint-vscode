import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'
import ignore, { type Ignore } from 'ignore'
import type { Connection, DidChangeWatchedFilesParams } from 'vscode-languageserver'
import { getWorkspaceFolderRoot, inferFilePath } from './utils'

export default class FileFilter {
  ig: Map<string, Ignore | null> = new Map()
	connection: Connection

  constructor(connection: Connection) {
    this.init()
		this.connection = connection
  }

	async init() {
		const folders = await this.connection.workspace.getWorkspaceFolders() || []
		for (let i = 0; i < folders.length; i++) {
			const folder = folders[i]
			const file = resolve(folder.uri, '.zhlintignore')
			if (existsSync(file)) {
				const content = readFileSync(file, 'utf-8')
				console.log('filter content', file, content)
				const ig = ignore().add(content)
				this.ig.set(folder.uri, ig)
			}
		}
	}

  async reload(params: DidChangeWatchedFilesParams) {
		for (const change of params.changes) {
			if (change.uri.endsWith('.zhlintignore')) {
				const root = await getWorkspaceFolderRoot(this.connection, change.uri)
				const file = resolve(root, '.zhlintignore')
				if (existsSync(file)) {
					const content = readFileSync(file, 'utf-8')
					console.log('filter content', file, content)
					const ig = ignore().add(content)
					this.ig.set(root, ig)
				}
			}
		}
  }

  async ignores(uri: string) {
    const fileName = inferFilePath(uri)
    const dir = resolve('.')
		console.log('check ignore', uri, dir)
    if (fileName) {
      const name = relative(dir, fileName)
      console.log('resolve ignore', name)
      if (this.ig) {
				try {
					return this.ig.ignores(name)
				}
				catch (error) {
					console.error(error)
					return false
				}
			}
    }
    return false
  }
}
