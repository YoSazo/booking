import { createContext, useContext } from 'react';

export const GuestContext = createContext(null);

export function useGuest() {
  const context = useContext(GuestContext);
  if (!context) throw new Error('useGuest must be used within GuestProvider');
  return context;
}
