'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Modal } from './modal';

type ConfirmOptions = {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
};

type ConfirmState = ConfirmOptions & {
  resolve: (ok: boolean) => void;
};

let externalConfirm: ((opts: ConfirmOptions) => Promise<boolean>) | null = null;

/**
 * Promise-based confirm() replacement. Resolves true when user confirms,
 * false when they cancel or close. Pair with <ConfirmHost /> rendered
 * once at the app root.
 */
export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  if (!externalConfirm) {
    return Promise.resolve(window.confirm(typeof opts.message === 'string' ? opts.message : 'Are you sure?'));
  }
  return externalConfirm(opts);
}

export function ConfirmHost() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const ask = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...opts, resolve });
    });
  }, []);

  externalConfirm = ask;

  const handleResult = (ok: boolean) => {
    state?.resolve(ok);
    setState(null);
  };

  if (!state) return null;

  const isDestructive = state.variant === 'destructive';

  return (
    <Modal
      open
      onClose={() => handleResult(false)}
      title={state.title}
      size="sm"
    >
      <div className="p-5">
        <div className="text-sm text-gray-300">{state.message}</div>
        <div className="mt-5 flex gap-2 justify-end">
          <button
            onClick={() => handleResult(false)}
            className="px-3 py-1.5 text-sm text-gray-400 hover:text-white transition"
          >
            {state.cancelLabel ?? 'Cancel'}
          </button>
          <button
            onClick={() => handleResult(true)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium text-white transition ${
              isDestructive
                ? 'bg-red-500 hover:bg-red-400'
                : 'bg-emerald-500 hover:bg-emerald-400'
            }`}
          >
            {state.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
