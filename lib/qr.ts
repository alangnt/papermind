import QRCode from 'qrcode';
import { articleUrl } from '@/lib/site';

/**
 * Render an article's QR code as a PNG data URL.
 *
 * Error correction is set to 'M': high enough to survive a phone camera at an
 * angle, low enough to keep the module count small so the code stays scannable
 * when the card is printed or viewed small.
 */
export async function articleQrDataUrl(arxivId: string, width = 320): Promise<string> {
  return QRCode.toDataURL(articleUrl(arxivId), {
    width,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
}
