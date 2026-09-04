import { useEffect, useRef, useState } from "react";

const formatRemaining = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function SessionExpiryWarning({ deadline, onContinue, onLogout }) {
  const continueButtonRef = useRef(null);
  const expiryHandledRef = useRef(false);
  const [remaining, setRemaining] = useState(() => Math.max(0, (deadline || 0) - Date.now()));

  useEffect(() => {
    expiryHandledRef.current = false;
    continueButtonRef.current?.focus();

    const updateRemaining = () => {
      const nextRemaining = Math.max(0, (deadline || 0) - Date.now());
      setRemaining(nextRemaining);
      if (nextRemaining <= 0 && !expiryHandledRef.current) {
        expiryHandledRef.current = true;
        onLogout();
      }
    };

    const intervalId = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(intervalId);
  }, [deadline, onLogout]);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="session-expiry-title"
        aria-describedby="session-expiry-description"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <h2 id="session-expiry-title" className="text-lg font-semibold text-slate-900">
          Your session is about to expire
        </h2>
        <p id="session-expiry-description" className="mt-2 text-sm text-slate-600">
          You have been inactive. Continue working to restart the local inactivity timer.
        </p>
        <p className="mt-5 text-center text-3xl font-semibold tracking-wider text-indigo-700" aria-live="polite">
          {formatRemaining(remaining)}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Logout
          </button>
          <button
            ref={continueButtonRef}
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Continue Working
          </button>
        </div>
      </div>
    </div>
  );
}
