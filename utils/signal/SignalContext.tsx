import React, { createContext, useContext, useEffect, useState } from 'react';
import PersistentSignalStore from '../lib/PersistentSignalStore'; // adjust path if needed

export const SignalContext = createContext<any>(null);

export const SignalProvider = ({ children }: { children: React.ReactNode }) => {
  const [signalStore, setSignalStore] = useState(null);

  useEffect(() => {
    const init = async () => {
      const store = await PersistentSignalStore.initFromStorage();
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
