import type {
  TextDocument,
} from 'vscode-languageserver-textdocument'

import type {
  URI,
} from 'vscode-uri'

import {
  getFileSystemPath,
  getUri,
} from './paths'

export function inferFilePath(documentOrUri: string | TextDocument | URI | undefined): string | undefined {
  if (!documentOrUri)
    return undefined

  const uri = getUri(documentOrUri)
  if (uri.scheme === 'file')
    return getFileSystemPath(uri)

  return undefined
}

export function getWorkspaceFolderRoot(connection: any, uri: string): Promise<string> {
	return new Promise((resolve) => {
		connection.sendNotification('getWorkspace', uri)
		const disposable = connection.onNotification('onHandleWorkspace', (_uri: string, rootPath: string) => {
			console.log('get find workspace: ', _uri, rootPath)
			if (uri === _uri) {
				resolve(rootPath)
				disposable.dispose()
			}
		})
	})
}
