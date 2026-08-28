'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Copy, Download, Loader2, Share2, X } from 'lucide-react';

import { articleUrl } from '@/lib/site';

type Props = {
  arxivId: string;
  title: string;
  onClose: () => void;
};

/** The server already renders this exact card for Open Graph, so previewing and
 *  downloading the same URL guarantees the saved image matches what people see
 *  when the link is posted anywhere. */
function cardImageUrl(arxivId: string): string {
  return `/api/og/article?id=${encodeURIComponent(arxivId)}`;
}

export default function ShareCard({ arxivId, title, onClose }: Props) {
  const url = articleUrl(arxivId);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // Reset the confirmation tick so a second copy still reads as an action.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch (error) {
      console.error('Could not copy the link', error);
    }
  }, [url]);

  const download = useCallback(async () => {
    setDownloading(true);
    try {
      const response = await fetch(cardImageUrl(arxivId));
      if (!response.ok) throw new Error(`Card request failed: ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `papermind-${arxivId.replace('/', '-')}.png`;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Could not download the card', error);
    } finally {
      setDownloading(false);
    }
  }, [arxivId]);

  const shareNatively = useCallback(async () => {
    try {
      await navigator.share({ title, url });
    } catch (error) {
      // An abort is the user closing the sheet, not a failure worth reporting.
      if ((error as Error)?.name !== 'AbortError') {
        console.error('Could not open the share sheet', error);
      }
    }
  }, [title, url]);

  const canShareNatively =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  // Rendered into the body rather than in place: the swipe deck applies a rotate
  // transform to its card, and a transformed ancestor makes a fixed overlay
  // position against that card instead of against the viewport.
  if (typeof window === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Share this paper"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="relative w-full max-w-xl bg-foreground border border-gray-700 rounded-2xl p-5 shadow-2xl text-white space-y-4"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold">Share this paper</h2>
              <p className="text-[11px] text-gray-400">
                Anyone who scans the code lands on this paper in Papermind.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/40 aspect-[1200/630]">
            {!imageLoaded && !imageFailed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            )}
            {imageFailed ? (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-[11px] text-gray-400">
                The card preview could not be generated. The link and QR code still work.
              </div>
            ) : (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={cardImageUrl(arxivId)}
                alt={`Share card for ${title}`}
                className={`w-full h-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageFailed(true)}
              />
            )}
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-white/5 border border-white/10">
            <span className="text-[11px] text-gray-300 truncate flex-1">{url}</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={download}
              disabled={downloading || imageFailed}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-white text-black hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              Save the card
            </button>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {canShareNatively && (
              <button
                type="button"
                onClick={shareNatively}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    window.document.body
  );
}
