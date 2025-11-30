import React from "react";
import ModalShell from "../components/ModalShell";
import ReceiverForm from "../forms/ReceiverForm";

export default function ReceiverModal({ open, onClose, onCreated }) {
  return (
    <ModalShell open={open} onClose={onClose} title="Add Receiver">
      <ReceiverForm onClose={onClose} onCreated={onCreated} />
    </ModalShell>
  );
}
