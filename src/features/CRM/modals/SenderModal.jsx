import React from "react";
import ModalShell from "../components/ModalShell";
import SenderForm from "../forms/SenderForm";

export default function SenderModal({ open, onClose, onCreated }) {
  return (
    <ModalShell open={open} onClose={onClose} title="Add Sender">
      <SenderForm onClose={onClose} onCreated={onCreated} />
    </ModalShell>
  );
}
