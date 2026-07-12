/**
 * Auth API — POST /auth/*
 *
 * Permissions: all endpoints are public (pre-login) except getSession.
 * Signup always creates a plain Employee — no role selection.
 */

import { get, post, setToken, clearToken, setStoredUser, clearStoredUser } from './client';

/**
 * Register a new employee account.
 * Signup returns the created UserResponse directly (no token).
 * @param {{ name: string, email: string, password: string }} data
 */
export async function signup(data) {
  const res = await post('/auth/signup', data);
  return res;
}

/**
 * Authenticate and receive a session token, then fetch user profile.
 * @param {{ email: string, password: string }} data
 */
export async function login(data) {
  const res = await post('/auth/login', data);
  if (res?.accessToken) {
    setToken(res.accessToken);
    // Fetch user profile immediately after login to retrieve role
    const user = await getSession();
    return { ...res, user };
  }
  return res;
}

/**
 * End the current session.
 */
export async function logout() {
  try {
    await post('/auth/logout');
  } catch (err) {
    console.error('Logout request failed:', err);
  } finally {
    clearToken();
    clearStoredUser();
  }
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
 * Backend /session returns the UserResponse object directly.
 */
export async function getSession() {
  const res = await get('/auth/session');
  if (res && res.id) {
    setStoredUser(res);
  }
  return res;
}
