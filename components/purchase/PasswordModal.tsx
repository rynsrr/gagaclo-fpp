'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  UserCheck,
  X,
  UserPlus,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Sparkles,
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
  initialTab?: 'SELECT' | 'MANAGE';
  onLogout?: () => void;
}

export { getUsers, formatUserName } from '@/lib/userService';

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  initialTab = 'SELECT',
  onLogout,
}: PasswordModalProps) {
  const [activeTab, setActiveTab] = useState<'SELECT' | 'MANAGE'>(initialTab);
  const [userList, setUserList] = useState<string[]>(() => getUsers());
  const [activeUser, setActiveUser] = useState<string | null>(null);

  // Manage form state
  const [newUserName, setNewUserName] = useState('');
  const [manageNotice, setManageNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const newUserInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const refresh = () => {
      setUserList(getUsers());
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('fpp_edit_user') || sessionStorage.getItem('fpp_edit_user');
        setActiveUser(saved);
      }
    };
    refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('fpp-users-updated', refresh);
      return () => window.removeEventListener('fpp-users-updated', refresh);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setManageNotice(null);
      setNewUserName('');
      setUserList(getUsers());
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('fpp_edit_user') || sessionStorage.getItem('fpp_edit_user');
        setActiveUser(saved);
      }

      if (initialTab === 'MANAGE') {
        setTimeout(() => newUserInputRef.current?.focus(), 60);
      }
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Langsung pilih user dengan 1 klik (tanpa password)
  const handleSelectUser = (cleanUser: string) => {
    try {
      localStorage.setItem('fpp_edit_user', cleanUser);
      sessionStorage.setItem('fpp_edit_user', cleanUser);
    } catch {}

    onSuccess(cleanUser);
    onClose();
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
        message: `✓ User "${formatUserName(added)}" berhasil ditambahkan! Anda dapat langsung memilihnya.`,
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

    const promptText = `Apakah Anda yakin ingin menghapus user "${formatUserName(userToDelete)}"?\nAkun ini tidak akan muncul lagi di daftar editor.`;
    if (confirm(promptText)) {
      const result = removeUser(userToDelete);
      if (result.success) {
        setUserList(result.users);
        setManageNotice({
          type: 'success',
          message: `✓ User "${formatUserName(userToDelete)}" berhasil dihapus.`,
        });

        if (activeUser === userToDelete) {
          setActiveUser(null);
          if (onLogout) onLogout();
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
        aria-labelledby="user-modal-title"
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
                setActiveTab('SELECT');
                setManageNotice(null);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'SELECT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Pilih Akun ({userList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('MANAGE');
                setTimeout(() => newUserInputRef.current?.focus(), 50);
              }}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                activeTab === 'MANAGE'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kelola User</span>
            </button>
          </div>
        </div>

        {/* TAB 1: PILIH AKUN (1-KLIK LANGSUNG MASUK, TANPA PASSWORD) */}
        {activeTab === 'SELECT' && (
          <div className="space-y-4">
            <div>
              <h2 id="user-modal-title" className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pilih Akun Anda</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Klik salah satu nama di bawah untuk langsung mengedit dokumen FPP. Tidak memerlukan password.
              </p>
            </div>

            {/* Grid Kartu User 1-Klik */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto pr-1">
              {userList.map((user) => {
                const isCurrent = activeUser === user;
                return (
                  <button
                    key={user}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition active:scale-95 group ${
                      isCurrent
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 hover:bg-blue-50/50 dark:hover:bg-zinc-800 hover:border-blue-300 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0 transition ${
                        isCurrent
                          ? 'bg-blue-600 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 group-hover:bg-blue-500 group-hover:text-white'
                      }`}
                    >
                      {user.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold capitalize truncate">
                        {user}
                      </div>
                      <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        {isCurrent ? 'Sedang Aktif' : 'Klik untuk masuk'}
                      </div>
                    </div>
                  </button>
                );
              })}

              {/* Tombol Tambah User Cepat */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('MANAGE');
                  setTimeout(() => newUserInputRef.current?.focus(), 50);
                }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-400 transition text-xs font-medium"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Tambah User</span>
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('MANAGE');
                  setTimeout(() => newUserInputRef.current?.focus(), 50);
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Kelola / Hapus User</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-white rounded-lg transition"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: KELOLA USER (TAMBAH & HAPUS USER) */}
        {activeTab === 'MANAGE' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Kelola Akun Editor</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Tambah user baru atau hapus user yang sudah tidak digunakan.
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
                  placeholder="Ketik nama (contoh: budi, intan)..."
                  required
                  className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition lowercase"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm active:scale-95 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
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
                        {activeUser === user && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            • Sedang aktif
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="px-2 py-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded transition"
                        title={`Masuk sebagai ${formatUserName(user)}`}
                      >
                        Pilih
                      </button>
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
                  </div>
                ))}
              </div>
            </div>

            {/* Back Button */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('SELECT');
                  setManageNotice(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Pilih Akun</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
