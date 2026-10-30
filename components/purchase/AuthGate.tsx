'use client';
import { createContext, useContext, ReactNode } from 'react';

const Context = createContext({
  required: false,
  role: 'admin',
  email: '',
  canEdit: true,
  canDelete: true,
});

export const useFppAccess = () => useContext(Context);

export default function AuthGate({ children }: { children: ReactNode }) {
  const access = {
    required: false,
    role: 'admin',
    email: '',
    canEdit: true,
    canDelete: true,
  };

  return <Context.Provider value={access}>{children}</Context.Provider>;
}
