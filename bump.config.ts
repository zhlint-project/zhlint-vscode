import { defineConfig } from 'bumpp';

export default defineConfig({
		files: [
			'package.json',
			'package-lock.json',
			'./client/package.json',
			'./client/package-lock.json',
			'./server/package.json',
			'./server/package-lock.json',
		],

		commit: true,
		tag: true,
		push: false,
});