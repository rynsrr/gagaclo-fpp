export const DEFAULT_USERS = ['royan', 'ryan', 'ami', 'hanami', 'cynara'];

const USERS_STORAGE_KEY = 'gagaclo_users_v1';

export function normalizeUsername(name: string): string {
  return (name || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
}

export function formatUserName(name?: string | null): string {
  if (!name) return 'Royan';
  const clean = name.trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

/**
 * Get all available editor users (defaults + custom created users)
 */
export function getUsers(): string[] {
  if (typeof window === 'undefined') {
    return [...DEFAULT_USERS];
  }

  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
      return [...DEFAULT_USERS];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure all items are clean lowercase strings
      const cleaned = parsed.map((u) => normalizeUsername(String(u))).filter(Boolean);
      return Array.from(new Set(cleaned));
    }
  } catch (err) {
    console.warn('Failed to parse users from localStorage:', err);
  }

  return [...DEFAULT_USERS];
}

/**
 * Save users list to localStorage
 */
export function saveUsers(users: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const unique = Array.from(new Set(users.map(normalizeUsername).filter(Boolean)));
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(unique));
    window.dispatchEvent(new CustomEvent('fpp-users-updated'));
  } catch (err) {
    console.error('Failed to save users to localStorage:', err);
  }
}

/**
 * Add a new user
 * Password convention: password is identical to the username
 */
export function addUser(name: string): { success: boolean; error?: string; users: string[] } {
  const clean = normalizeUsername(name);
  if (!clean || clean.length < 2) {
    return {
      success: false,
      error: 'Nama user minimal 2 karakter (huruf/angka tanpa spasi).',
      users: getUsers(),
    };
  }

  const current = getUsers();
  if (current.includes(clean)) {
    return {
      success: false,
      error: `User "${clean}" sudah terdaftar sebelumnya.`,
      users: current,
    };
  }

  const updated = [...current, clean];
  saveUsers(updated);
  return { success: true, users: updated };
}

/**
 * Remove an existing user
 */
export function removeUser(name: string): { success: boolean; error?: string; users: string[] } {
  const clean = normalizeUsername(name);
  const current = getUsers();

  if (!current.includes(clean)) {
    return {
      success: false,
      error: `User "${clean}" tidak ditemukan.`,
      users: current,
    };
  }

  if (current.length <= 1) {
    return {
      success: false,
      error: 'Minimal harus ada 1 akun editor tersisa.',
      users: current,
    };
  }

  const updated = current.filter((u) => u !== clean);
  saveUsers(updated);

  // If the deleted user is currently logged in, clear storage
  if (typeof window !== 'undefined') {
    try {
      const active = localStorage.getItem('fpp_edit_user');
      if (active === clean) {
        localStorage.removeItem('fpp_edit_user');
        sessionStorage.removeItem('fpp_edit_user');
      }
    } catch {}
  }

  return { success: true, users: updated };
}

/**
 * Reset users to initial defaults
 */
export function resetUsersToDefault(): string[] {
  saveUsers(DEFAULT_USERS);
  return [...DEFAULT_USERS];
}
