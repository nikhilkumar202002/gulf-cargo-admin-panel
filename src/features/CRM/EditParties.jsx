// src/pages/.../EditParty.jsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPartyById } from "../../services/partyService";
import EditSenderParty from "./EditSenderParty";
import EditReceiverParty from "./EditReceiverParty";

export default function EditParty({ partyId: propPartyId, onClose, onSuccess }) {
  const { id: routeId } = useParams();
  const id = propPartyId ?? routeId;

  const [party, setParty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getPartyById(id);
        if (cancelled) return;
        if (!data) {
          setError("Party not found");
        } else {
          setParty(data);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.response?.data?.message || e?.message || "Failed to load party.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return <div className="p-4 text-red-600">Missing party ID.</div>;
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-slate-600">Loading party data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!party) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <p className="text-slate-600">Party not found.</p>
      </div>
    );
  }

  const typeId = Number(party.customer_type_id ?? party.customer_typeId);

  const handleSuccess = () => {
    if (typeof onSuccess === "function") onSuccess();
  };

  const handleClose = () => {
    if (typeof onClose === "function") onClose();
  };

  // 1 = Sender
  if (typeId === 1) {
    return (
      <EditSenderParty
        partyId={party.id}
        initialParty={party}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );
  }

  // 2 = Receiver
  if (typeId === 2) {
    return (
      <EditReceiverParty
        partyId={party.id}
        initialParty={party}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );
  }

  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <p className="text-red-600">
        Unsupported customer type: {String(typeId || "unknown")}
      </p>
    </div>
  );
}
