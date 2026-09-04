import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const KeyboardShortcutsContext = createContext(null);

const isEditableTarget = (target) => {
  if (!(target instanceof Element)) return false;
  return target.matches(
    'input, textarea, select, [contenteditable="true"], [role="combobox"], [role="menu"], [role="menuitem"]',
  );
};

export function KeyboardShortcutsProvider({ children }) {
  const escapeHandlers = useRef(new Map());
  const pageSearch = useRef(null);
  const nextHandlerId = useRef(0);
  const previousFocus = useRef(null);
  const [isGlobalSearchOpen, setGlobalSearchOpen] = useState(false);

  const openGlobalSearch = useCallback(() => {
    if (!isGlobalSearchOpen) previousFocus.current = document.activeElement;
    setGlobalSearchOpen(true);
  }, [isGlobalSearchOpen]);

  const closeGlobalSearch = useCallback(() => {
    setGlobalSearchOpen(false);
    const element = previousFocus.current;
    previousFocus.current = null;
    if (element instanceof HTMLElement && document.contains(element)) element.focus();
  }, []);

  const registerEscape = useCallback((handler, priority = 0) => {
    const id = nextHandlerId.current++;
    escapeHandlers.current.set(id, { handler, priority });
    return () => escapeHandlers.current.delete(id);
  }, []);

  const registerPageSearch = useCallback((focusSearch) => {
    pageSearch.current = focusSearch;
    return () => {
      if (pageSearch.current === focusSearch) pageSearch.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.isComposing) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        const highestEscape = [...escapeHandlers.current.values()].sort((a, b) => b.priority - a.priority)[0];
        if (highestEscape?.priority >= 100) return;
        event.preventDefault();
        openGlobalSearch();
        return;
      }

      if (event.key === "Escape") {
        const activeHandlers = [...escapeHandlers.current.values()].sort((a, b) => b.priority - a.priority);
        const activeHandler = activeHandlers.find(({ handler }) => handler() !== false);
        if (activeHandler) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        return;
      }

      if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditableTarget(event.target)) {
        if (pageSearch.current) {
          event.preventDefault();
          pageSearch.current();
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [openGlobalSearch]);

  useEffect(() => {
    if (!isGlobalSearchOpen) return undefined;
    const handler = () => closeGlobalSearch();
    const id = nextHandlerId.current++;
    const handlers = escapeHandlers.current;
    handlers.set(id, { handler, priority: 40 });
    return () => handlers.delete(id);
  }, [closeGlobalSearch, isGlobalSearchOpen]);

  const contextValue = useMemo(() => ({
    closeGlobalSearch,
    isGlobalSearchOpen,
    openGlobalSearch,
    registerEscape,
    registerPageSearch,
  }), [closeGlobalSearch, isGlobalSearchOpen, openGlobalSearch, registerEscape, registerPageSearch]);

  // The context exposes event callbacks that intentionally close over registries held in refs.
  return createElement(
    KeyboardShortcutsContext.Provider,
    // eslint-disable-next-line react-hooks/refs
    { value: contextValue },
    children,
  );
}

export default function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) throw new Error("useKeyboardShortcuts must be used within KeyboardShortcutsProvider");
  return context;
}
