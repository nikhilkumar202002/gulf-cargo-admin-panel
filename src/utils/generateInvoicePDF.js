import html2pdf from "html2pdf.js";

function waitForImagesToLoad(container) {
  const images = Array.from(container.querySelectorAll("img"));
  return Promise.all(
    images.map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // resolve even if image fails
          }
        })
    )
  );
}

export const generateInvoicePDF = async (shipment, openInNewTab = false) => {
  const element = document.getElementById("invoice-sheet");
  if (!element) {
    console.error("Invoice element not found");
    return;
  }

  await waitForImagesToLoad(element);

  const filename = `Invoice-${shipment?.booking_no || "document"}.pdf`;

  const opt = {
    // 1. Set 10mm margins (Top, Left, Bottom, Right)
    margin: [10, 10, 10, 10],

    filename: filename,
    image: { type: "jpeg", quality: 0.98 },

    html2canvas: {
      scale: 2,
      useCORS: true, // Essential for the Logo
      allowTaint: false, // Added to prevent tainting canvas
      scrollY: 0,

      // 2. Force the capture resolution to be standard Desktop size
      // This prevents the design from "breaking" or stacking like mobile
      windowWidth: 1200,
      width: 1200,
    },

    jsPDF: {
      unit: "mm",
      format: "a4",
      orientation: "portrait",
    },
  };

  try {
    if (openInNewTab) {
      const pdfBlobUrl = await html2pdf().set(opt).from(element).outputPdf("bloburl");
      window.open(pdfBlobUrl); // open PDF in a new tab
    } else {
      await html2pdf().set(opt).from(element).save();
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
