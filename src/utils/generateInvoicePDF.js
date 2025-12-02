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
            img.onerror = () => resolve();
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
    margin: [10, 10, 10, 10],
    filename,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      scrollY: 0,
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
      const url = await html2pdf().set(opt).from(element).outputPdf("bloburl");
      window.open(url);
    } else {
      await html2pdf().set(opt).from(element).save();
    }
  } catch (err) {
    console.error("Error generating PDF:", err);
  }
};
