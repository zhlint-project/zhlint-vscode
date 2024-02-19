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
