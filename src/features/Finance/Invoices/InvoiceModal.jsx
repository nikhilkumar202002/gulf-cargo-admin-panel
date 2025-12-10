// src/pages/InvoiceModal.jsx
import React from "react";
import InvoiceView from "../../Finance/Invoices/InvoiceView";
import html2pdf from "html2pdf.js";

export default function InvoiceModal({ open, onClose, shipment }) {
  if (!open || !shipment) return null;


  const openPDFInNewTab = async () => {
  const el = document.getElementById("invoice-sheet");

  const opt = {
    margin: 5,
    filename: "invoice.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 3, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  const pdfBlob = await html2pdf().set(opt).from(el).toPdf().output("blob");

  const url = URL.createObjectURL(pdfBlob);
  window.open(url, "_blank");
};

const sharePDFOnWhatsApp = async () => {
  const el = document.getElementById("invoice-sheet");

  const opt = {
    margin: 5,
    filename: "invoice.pdf",
    image: { type: "jpeg", quality: 1 },
    html2canvas: { scale: 3, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  const pdfBlob = await html2pdf().set(opt).from(el).toPdf().output("blob");
  const file = new File([pdfBlob], "invoice.pdf", { type: "application/pdf" });

  if (navigator.share) {
    await navigator.share({
      title: "Invoice",
      text: "Your invoice is ready.",
      files: [file],
    });
  } else {
    alert("Sharing not supported on this device.");
  }
};

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="absolute inset-0 p-4 overflow-auto">
        <div className="mx-auto max-w-6xl bg-white rounded-2xl shadow-2xl">

          {/* HEADER – NOT PRINTED */}
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b bg-white px-4 py-2 print:hidden">
            <button
              onClick={onClose}
              className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              ✕ Close
            </button>

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => {
                  if (shipment?.booking_no) {
                    const safe = String(shipment.booking_no)
                      .replace(/[\\/:*?"<>|]/g, "-");
                    document.title = safe;
                  }
                  window.print();
                }}
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Print / Save PDF
              </button>
            </div>

            <div className="md:hidden px-4 py-3 flex gap-2">
  <button
    onClick={() => window.print()}
    className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold text-sm"
    
  >
    View PDF
  </button>

  <button
    onClick={() => sharePDFOnWhatsApp(shipment)}
    className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-white font-semibold text-sm"
  >
    WhatsApp
  </button>
</div>
          </div>

          {/* BODY */}
          <InvoiceView shipment={shipment} modal />
        </div>
      </div>
    </div>
  );
}
