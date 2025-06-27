import React, { createContext, useContext, useEffect, useState } from 'react';
import SignalStore from './SignalStore';

export const SignalContext = createContext<SignalStore | null>(null);

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

export const useSignal = () => useContext(SignalContext);
