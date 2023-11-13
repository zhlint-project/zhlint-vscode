import { assertEqualAfterFix } from './helper';

suite('zhlintrc, zhlintignore should work', () => {
	test('zhlintrc, zhlintignore should work', async () => {
		await assertEqualAfterFix('example-zhlintrc');
	});
});