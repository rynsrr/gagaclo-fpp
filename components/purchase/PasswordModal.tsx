'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, UserCheck, Eye, EyeOff, X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string) => void;
}

export const ALLOWED_USERS = ['royan', 'ryan', 'amin', 'hanami', 'cynara'];

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: PasswordModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError(null);
      setShowPassword(false);
      setTimeout(() => {
        usernameInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim().toLowerCase();

    if (!cleanUser) {
      setError('Pilih atau ketik nama user.');
      usernameInputRef.current?.focus();
      return;
    }

    if (!ALLOWED_USERS.includes(cleanUser)) {
      setError('User tidak terdaftar. Pilihan: royan, ryan, amin, hanami, cynara.');
      usernameInputRef.current?.focus();
      return;
    }

    // Password sama dengan nama
    if (cleanPass !== cleanUser) {
      setError('Password salah! Password sama dengan nama user.');
      passwordInputRef.current?.focus();
      return;
    }

    try {
      localStorage.setItem('fpp_edit_user', cleanUser);
      sessionStorage.setItem('fpp_edit_user', cleanUser);
    } catch {}

    setError(null);
    onSuccess(cleanUser);
    onClose();
  };

  const handleSelectUserChip = (user: string) => {
    setUsername(user);
    setError(null);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xl text-zinc-900 dark:text-white space-y-4 relative"
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

        {/* Header */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 id="password-modal-title" className="text-base font-semibold">
              Masuk Akun Editor
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Pilih akun editor untuk membuat atau mengubah FPP
            </p>
          </div>
        </div>

        {/* Quick User Chips */}
        <div>
          <span className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
            Pilih Cepat Akun:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {ALLOWED_USERS.map((user) => (
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
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label
              htmlFor="edit-username-input"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Nama User
            </label>
            <div className="relative">
              <input
                ref={usernameInputRef}
                id="edit-username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="royan, ryan, amin, hanami, cynara"
                required
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>
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
                  if (error) setError(null);
                }}
                placeholder="Password (sama dengan nama)..."
                required
                className={`w-full rounded-xl border ${
                  error
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
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium mt-1.5">{error}</p>
            )}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
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
        </form>
      </div>
    </div>
  );
}
