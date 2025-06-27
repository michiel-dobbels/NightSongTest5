// lib/signal/SignalProvider.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import SignalStore from './SignalStore';

const SignalContext = createContext<SignalStore | null>(null);

export const SignalProvider = ({ children }: { children: React.ReactNode }) => {
  const [signalStore, setSignalStore] = useState<SignalStore | null>(null);

  useEffect(() => {
    const init = async () => {
      const store = await SignalStore.initFromStorage();
      setSignalStore(store);
    };
    init();
  }, []);

  if (!signalStore) return null; // or splash screen

  return (
    <SignalContext.Provider value={signalStore}>
      {children}
    </SignalContext.Provider>
  );
};

export const useSignalStore = () => {
  const ctx = useContext(SignalContext);
  if (!ctx) throw new Error("SignalStore not initialized yet");
  return ctx;
};
