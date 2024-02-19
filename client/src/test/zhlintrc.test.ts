import { assertEqualAfterFix } from './helper'

suite('zhlintrc, zhlintignore should work', () => {
  it('zhlintrc, zhlintignore should work', async () => {
    await assertEqualAfterFix('example-zhlintrc')
  })
})
