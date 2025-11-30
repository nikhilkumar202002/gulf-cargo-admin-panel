import React from "react";
import { createPortal } from "react-dom";
import styles from "./ModalShell.module.css"; // CSS Module

export default function ModalShell({ open, onClose, title = "Dialog", children, maxWidth = "max-w-5xl" }) {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative z-[101] w-full ${maxWidth} rounded-2xl bg-white shadow-2xl`}>
        {/* Header */}
        <div className={styles.header}>
          <h4 className={styles.title}>{title}</h4>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[85vh] overflow-auto p-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}
