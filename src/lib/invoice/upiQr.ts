import QRCode from "qrcode";

/** Build a UPI intent string for QR payment. */
export function buildUpiPayUrl(input: {
  upiId: string;
  payeeName: string;
  amount?: number;
  invoiceNumber?: string;
}): string | null {
  const pa = input.upiId.trim();
  if (!pa) return null;

  const params = new URLSearchParams();
  params.set("pa", pa);
  if (input.payeeName.trim()) params.set("pn", input.payeeName.trim());
  params.set("cu", "INR");
  if (input.amount && input.amount > 0) {
    params.set("am", input.amount.toFixed(2));
  }
  if (input.invoiceNumber?.trim()) {
    params.set("tn", `Invoice ${input.invoiceNumber.trim()}`);
  }
  return `upi://pay?${params.toString()}`;
}

/** Synchronous SVG QR so invoice HTML stays sync and print-safe. */
export function buildQrSvgDataUrl(payload: string, size = 118): string | null {
  try {
    const qr = QRCode.create(payload, { errorCorrectionLevel: "M" });
    const modules = qr.modules;
    const count = modules.size;
    const cell = size / count;
    const parts: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="UPI payment QR code">`,
      `<rect width="${size}" height="${size}" fill="#ffffff"/>`,
    ];

    for (let row = 0; row < count; row++) {
      for (let col = 0; col < count; col++) {
        if (modules.get(row, col)) {
          parts.push(
            `<rect x="${(col * cell).toFixed(2)}" y="${(row * cell).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#111111"/>`
          );
        }
      }
    }
    parts.push("</svg>");
    const svg = parts.join("");
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  } catch {
    return null;
  }
}
