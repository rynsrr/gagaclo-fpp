'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lock, KeyRound, Eye, EyeOff, X } from 'lucide-react';

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().toLowerCase() === 'takbir') {
      try {
        sessionStorage.setItem('fpp_edit_unlocked', 'true');
      } catch {}
      setError(null);
      setPassword('');
      onSuccess();
      onClose();
    } else {
      setError('Password salah! Silakan coba lagi.');
      inputRef.current?.focus();
    }
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
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 id="password-modal-title" className="text-base font-semibold">
              Akses Mode Edit
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Masukkan password untuk mengedit formulir
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          <div>
            <label
              htmlFor="edit-password-input"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Password
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                id="edit-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ketik password edit..."
                required
                className={`w-full rounded-xl border ${
                  error
                    ? 'border-red-500 focus:ring-red-400'
                    : 'border-zinc-300 dark:border-zinc-700 focus:ring-amber-500'
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
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs rounded-xl transition active:scale-95 shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Buka Kunci</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
