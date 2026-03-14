import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCredentials } from '../js/auth.js';

test('validateCredentials accepte les identifiants configurés', () => {
  assert.equal(validateCredentials('joe', 'admin'), true);
});

test('validateCredentials rejette des identifiants invalides', () => {
  assert.equal(validateCredentials('joe', 'wrong'), false);
  assert.equal(validateCredentials('wrong', 'admin'), false);
});
