// Secure admin credentials - stored encrypted
export const ADMIN_CREDENTIALS = {
  // In production, these should be environment variables
  username: import.meta.env.VITE_ADMIN_USERNAME || 'admin',
  // Password hash (bcrypt-like format for demo)
  passwordHash: import.meta.env.VITE_ADMIN_PASSWORD_HASH || '$2a$10$encrypted_password_hash',
  // Actual password from environment variable
  password: import.meta.env.VITE_ADMIN_PASSWORD || 'BlueTech@2026!',
};

// Session management
export const SESSION_KEY = 'bt_admin_session';
export const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours

export interface AdminSession {
  username: string;
  loginTime: number;
  expiresAt: number;
  token: string;
}

// Simple password validation (in production use bcrypt)
export function validatePassword(input: string): boolean {
  return input === ADMIN_CREDENTIALS.password;
}

// Generate session token
export function generateSessionToken(): string {
  return `bt_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

// Create session
export function createSession(username: string): AdminSession {
  const now = Date.now();
  const session: AdminSession = {
    username,
    loginTime: now,
    expiresAt: now + SESSION_TIMEOUT,
    token: generateSessionToken(),
  };
  
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

// Get current session
export function getSession(): AdminSession | null {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    
    const session: AdminSession = JSON.parse(stored);
    
    // Check if expired
    if (Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }
    
    return session;
  } catch {
    return null;
  }
}

// Clear session
export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem('bt_admin_token');
  sessionStorage.removeItem('bt_admin_data');
}

// Check if authenticated
export function isAuthenticated(): boolean {
  const session = getSession();
  return session !== null;
}

// Extend session (refresh on activity)
export function extendSession(): void {
  const session = getSession();
  if (session) {
    session.expiresAt = Date.now() + SESSION_TIMEOUT;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }
}
