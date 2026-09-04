/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";

export default function useUnsavedChangesGuard({ isDirty, isSaving }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const bypassRef = useRef(false);
  const [bypass, setBypass] = useState(false);
  const blocker = useBlocker(Boolean(isDirty && !isSaving && !bypass && !bypassRef.current));

  useBeforeUnload(
    useCallback(
      (event) => {
        if (isDirty && !isSaving) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [isDirty, isSaving],
    ),
  );

  useEffect(() => {
    if (blocker.state === "blocked") setConfirmOpen(true);
  }, [blocker.state]);

  useEffect(() => {
    if (!isDirty && bypass) {
      // Reset the save bypass so a later edit is protected again.
      bypassRef.current = false;
      setBypass(false);
    }
  }, [bypass, isDirty]);

  const requestLeave = useCallback(
    (action) => {
      if (!isDirty || isSaving) {
        action?.();
        return;
      }
      setPendingAction(() => action);
      setConfirmOpen(true);
    },
    [isDirty, isSaving],
  );

  const stay = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
    setPendingAction(null);
    setConfirmOpen(false);
  }, [blocker]);

  const leave = useCallback(() => {
    const action = pendingAction;
    setPendingAction(null);
    setConfirmOpen(false);

    if (blocker.state === "blocked") {
      blocker.proceed();
      return;
    }

    bypassRef.current = true;
    setBypass(true);
    action?.();
  }, [blocker, pendingAction]);

  const markCleanAnd = useCallback((action) => {
    bypassRef.current = true;
    setBypass(true);
    action?.();
  }, []);

  return {
    confirmOpen,
    requestLeave,
    stay,
    leave,
    markCleanAnd,
  };
}
