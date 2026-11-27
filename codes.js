// Generadores locales. Estas dependencias se empaquetan con la app; no usan CDN.
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export async function generateQrDataUrl(value, { width = 320, margin = 2 } = {}) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('Escribe el contenido que llevará el código QR');
  return QRCode.toDataURL(text, { width, margin, errorCorrectionLevel: 'M', type: 'image/png' });
}

export function generateBarcodeSvg(value, { format = 'CODE128', displayValue = true } = {}) {
  const text = String(value ?? '').trim();
  if (!text) throw new Error('El código de barras no puede estar vacío');
  if (typeof document === 'undefined') throw new Error('La generación SVG requiere el entorno visual de la aplicación');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  try {
    JsBarcode(svg, text, { format, displayValue, lineColor: '#111111', background: '#ffffff', margin: 10, height: 72, width: 2 });
  } catch {
    throw new Error(`El valor no es válido para el formato ${format}`);
  }
  return new XMLSerializer().serializeToString(svg);
}
