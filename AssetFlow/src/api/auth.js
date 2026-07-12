/**
 * Auth API — POST /auth/*
 *
 * Permissions: all endpoints are public (pre-login) except getSession.
 * Signup always creates a plain Employee — no role selection.
 */

import { get, post, setToken, clearToken, setStoredUser, clearStoredUser } from './client';

/**
 * Register a new employee account.
 * Role is always Employee — never exposed at signup (see modelsAndEndpoints.md §3).
 * @param {{ name: string, email: string, password: string }} data
 */
export async function signup(data) {
  const res = await post('/auth/signup', data);
  if (res?.token) setToken(res.token);
  if (res?.user) setStoredUser(res.user);
  return res;
}

/**
 * Authenticate and receive a session token.
 * @param {{ email: string, password: string }} data
 */
export async function login(data) {
  const res = await post('/auth/login', data);
  if (res?.token) setToken(res.token);
  if (res?.user) setStoredUser(res.user);
  return res;
}

/**
 * End the current session.
 */
export async function logout() {
  await post('/auth/logout');
  clearToken();
  clearStoredUser();
}

/**
 * Request a password-reset email.
 * @param {{ email: string }} data
 */
export function forgotPassword(data) {
  return post('/auth/forgot-password', data);
}

/**
 * Set a new password using the reset token.
 * @param {{ token: string, password: string }} data
 */
export function resetPassword(data) {
  return post('/auth/reset-password', data);
}

/**
 * Validate the current session and return the logged-in user.
 * Useful on app mount to check if the stored token is still valid.
 */
export async function getSession() {
  const res = await get('/auth/session');
  if (res?.user) setStoredUser(res.user);
  return res;
}
