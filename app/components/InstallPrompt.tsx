'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'install-prompt-dismissed-at';
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000; // 24 jam

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_DURATION_MS;
  } catch {
    return false; // localStorage tidak tersedia (mode privat, dll.)
  }
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Jika masih dalam masa 24 jam setelah ditutup, jangan pasang listener sama sekali
    if (isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null); // event hanya bisa dipakai sekali
  };

  const handleClose = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // abaikan jika gagal menyimpan
    }
    setDeferred(null);
  };

  return (
    <div className="fixed top-6 left-6 z-50 flex items-center bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md overflow-hidden">
      <button
        type="button"
        onClick={handleInstall}
        className="flex items-center gap-2 pl-4 pr-3 py-2.5 hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <Download className="h-4 w-4" />
        Pasang Aplikasi
      </button>
      <button
        type="button"
        onClick={handleClose}
        aria-label="Tutup tawaran pemasangan"
        className="px-2.5 py-2.5 border-l border-blue-500 hover:bg-blue-700 transition-colors cursor-pointer"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}