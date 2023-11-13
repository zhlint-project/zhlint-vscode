import ignore, { type Ignore } from 'ignore';
import { existsSync, readFileSync } from 'fs';
import { resolve, relative } from 'path';
import { DidChangeWatchedFilesParams } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { inferFilePath } from './utils';

export default class FileFilter {

	ig: Ignore | null = null;

	constructor() {
		this.reload();
	}

	reload(params?: DidChangeWatchedFilesParams) {
		if (params) {
			if (-1 === params.changes.findIndex(item => item.uri.endsWith('.experimental-zhlintignore'))) {
				return;
			}
		}

		const file = resolve('.', '.experimental-zhlintignore');
		if (existsSync(file)) {
			const content = readFileSync(file, 'utf-8');
			console.log('filter content', content);	
			this.ig = ignore().add(content);
		} else {
			this.ig = null;
		}
	}

	ignores(uri: string) {
		const fileName = inferFilePath(uri);
		const dir = resolve('.');
		if (fileName) {
			const name = relative(dir, fileName);
			console.log('resolve ignore', name);
			if (this.ig) return this.ig.ignores(name);
		}
		return false;
	}
}