'use client';

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react';
import { UploadDialog } from './upload-dialog';

type UploadContextValue = {
  open: () => void;
};

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <UploadContext.Provider value={{ open }}>
      {children}
      <UploadDialog open={isOpen} onClose={close} />
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) {
    return { open: () => {} };
  }
  return ctx;
}
