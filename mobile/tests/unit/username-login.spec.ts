import { expect, test } from 'vitest';
import { validateLoginInput, validateRegisterInput } from '@/utils/auth';

test('supports username login while registration still requires an email', () => {
  expect(validateLoginInput({ email: 'admin', password: 'test-password' })).toEqual({});
  expect(validateRegisterInput({ username: 'real_user', firstName: 'Test', lastName: 'User', email: 'admin', password: 'test-password', confirmPassword: 'test-password' }).email).toBeTruthy();
});
