import { APP_CREDENTIALS } from './constants.js';

export function validateCredentials(username, password) {
  return username === APP_CREDENTIALS.username && password === APP_CREDENTIALS.password;
}
