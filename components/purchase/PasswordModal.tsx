'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  UserCheck,
  Eye,
  EyeOff,
  X,
  UserPlus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import {
  getUsers,
  addUser,
  removeUser,
  formatUserName,
} from '@/lib/userService';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
  initialTab?: 'LOGIN' | 'MANAGE';
  onLogout?: () => void;
}

export { getUsers, formatUserName } from '@/lib/userService';

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'LOGIN',
  onLogout,
}: PasswordModalProps) {
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'MANAGE'>(initialTab);
  const [userList, setUserList] = useState<string[]>(() => getUsers());

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Manage form state
  const [newUserName, setNewUserName] = useState('');
  const [manageNotice, setManageNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const newUserInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => setUserList(getUsers());
    refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('fpp-users-updated', refresh);
      return () => window.removeEventListener('fpp-users-updated', refresh);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setUsername('');
      setPassword('');
      setLoginError(null);
      setManageNotice(null);
      setNewUserName('');
      setShowPassword(false);
      setUserList(getUsers());

      setTimeout(() => {
        if (initialTab === 'LOGIN') {
          usernameInputRef.current?.focus();
        } else {
          newUserInputRef.current?.focus();
        }
      }, 60);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim().toLowerCase();

    if (!cleanUser) {
      setLoginError('Pilih atau ketik nama user.');
      usernameInputRef.current?.focus();
      return;
    }

    const currentUsers = getUsers();
    if (!currentUsers.includes(cleanUser)) {
      setLoginError(`User "${cleanUser}" belum terdaftar. Tambahkan di tab Kelola User.`);
      usernameInputRef.current?.focus();
      return;
    }

    // Password sama dengan nama user (atau 'admin' / 'gagaclo')
    if (cleanPass !== cleanUser && cleanPass !== 'admin' && cleanPass !== 'gagaclo') {
      setLoginError('Password salah! Password sama dengan nama user.');
      passwordInputRef.current?.focus();
      return;
    }

    try {
      localStorage.setItem('fpp_edit_user', cleanUser);
      sessionStorage.setItem('fpp_edit_user', cleanUser);
    } catch {}

    setLoginError(null);
    onSuccess(cleanUser);
    onClose();
  };

  const handleSelectUserChip = (user: string) => {
    setUsername(user);
    setLoginError(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setManageNotice(null);
    const result = addUser(newUserName);
    if (result.success) {
      setUserList(result.users);
      const added = newUserName.trim().toLowerCase();
      setNewUserName('');
      setManageNotice({
        type: 'success',
        message: `✓ User "${added}" berhasil ditambahkan! Password sama dengan nama: "${added}".`,
      });
      setTimeout(() => newUserInputRef.current?.focus(), 50);
    } else {
      setManageNotice({
        type: 'error',
        message: result.error || 'Gagal menambahkan user.',
      });
    }
  };

  const handleDeleteUser = (userToDelete: string) => {
    if (userList.length <= 1) {
      alert('Tidak dapat menghapus. Minimal harus ada 1 akun editor tersisa.');
      return;
    }

    const promptText = `Apakah Anda yakin ingin menghapus user "${formatUserName(userToDelete)}"?\nAkun ini tidak akan bisa login lagi untuk mengedit FPP.`;
    if (confirm(promptText)) {
      const result = removeUser(userToDelete);
      if (result.success) {
        setUserList(result.users);
        setManageNotice({
          type: 'success',
          message: `✓ User "${userToDelete}" berhasil dihapus.`,
        });

        // If currently selected or active user was deleted
        if (username === userToDelete) {
          setUsername('');
          setPassword('');
        }
        if (onLogout && typeof window !== 'undefined') {
          const active = localStorage.getItem('fpp_edit_user');
          if (active === userToDelete) {
            onLogout();
          }
        }
      } else {
        setManageNotice({
          type: 'error',
          message: result.error || 'Gagal menghapus user.',
        });
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl text-zinc-900 dark:text-white space-y-4 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-modal-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-white transition"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Tabs Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3 pr-8">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setManageNotice(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'LOGIN'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Masuk Editor</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('MANAGE');
                setLoginError(null);
                setTimeout(() => newUserInputRef.current?.focus(), 50);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'MANAGE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola User ({userList.length})</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LOGIN */}
        {activeTab === 'LOGIN' && (
          <div className="space-y-4">
            <div>
              <h2 id="password-modal-title" className="text-base font-semibold">
                Masuk Akun Editor
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Pilih atau ketik akun Anda untuk mengedit dokumen FPP
              </p>
            </div>

            {/* Quick User Chips */}
            <div>
              <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Pilih Cepat Akun:
              </span>
              <div className="flex flex-wrap gap-1.5 items-center">
                {userList.map((user) => (
                  <button
                    key={user}
                    type="button"
                    onClick={() => handleSelectUserChip(user)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition ${
                      username.toLowerCase() === user
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {user}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('MANAGE');
                    setTimeout(() => newUserInputRef.current?.focus(), 50);
                  }}
                  className="px-2 py-1 rounded-lg text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-dashed border-blue-400/50 flex items-center gap-1 transition"
                  title="Tambah akun user baru"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>Tambah User</span>
                </button>
              </div>
            </div>

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-3 pt-1">
              <div>
                <label
                  htmlFor="edit-username-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nama User
                </label>
                <input
                  ref={usernameInputRef}
                  id="edit-username-input"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Ketik nama user..."
                  required
                  className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition lowercase"
                />
              </div>

              <div>
                <label
                  htmlFor="edit-password-input"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    ref={passwordInputRef}
                    id="edit-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError(null);
                    }}
                    placeholder="Password (sama dengan nama user)..."
                    required
                    className={`w-full rounded-xl border ${
                      loginError
                        ? 'border-red-500 focus:ring-red-400'
                        : 'border-zinc-300 dark:border-zinc-700 focus:ring-emerald-500'
                    } bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {loginError && (
                  <p className="text-xs text-red-500 font-medium mt-1.5">{loginError}</p>
                )}
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                  * Password sama dengan nama akun (contoh: user <code className="text-zinc-600 dark:text-zinc-300">royan</code> password <code className="text-zinc-600 dark:text-zinc-300">royan</code>).
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('MANAGE');
                    setTimeout(() => newUserInputRef.current?.focus(), 50);
                  }}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Kelola User</span>
                </button>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition active:scale-95 shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Masuk Mode Edit</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: MANAGE USERS (ADD & DELETE) */}
        {activeTab === 'MANAGE' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Kelola Akun Editor</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tambah user baru atau hapus user. Password akun baru otomatis sama dengan nama user.
              </p>
            </div>

            {/* Notice Message */}
            {manageNotice && (
              <div
                className={`flex items-start gap-2 p-2.5 rounded-xl text-xs font-medium ${
                  manageNotice.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                }`}
              >
                {manageNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <span>{manageNotice.message}</span>
              </div>
            )}

            {/* Form Tambah User Baru */}
            <form onSubmit={handleAddUser} className="space-y-2">
              <label htmlFor="new-user-input" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Tambah User Baru:
              </label>
              <div className="flex gap-2">
                <input
                  ref={newUserInputRef}
                  id="new-user-input"
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Ketik nama user (contoh: budi, intan)..."
                  required
                  className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition lowercase"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah User</span>
                </button>
              </div>
            </form>

            {/* Daftar User Terdaftar */}
            <div>
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                Daftar User Terdaftar ({userList.length}):
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 divide-y divide-zinc-100 dark:divide-zinc-800/60">
                {userList.map((user) => (
                  <div
                    key={user}
                    className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs uppercase">
                        {user.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold capitalize text-zinc-900 dark:text-white">
                          {user}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          Password: <span className="font-mono">{user}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user)}
                      disabled={userList.length <= 1}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition disabled:opacity-30 disabled:hover:text-zinc-400"
                      title={userList.length <= 1 ? 'Minimal 1 user' : `Hapus user ${user}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Back Button */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setManageNotice(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Masuk Akun</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
