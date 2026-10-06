/**
 * ShareButton Component
 *
 * Copies a Wordle-style result to the clipboard (or opens the native share sheet on mobile).
 */

import { useState } from 'react';

export function ShareButton({ text, className = '' }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Share cancelled or clipboard blocked - nothing to do
    }
  };

  return (
    <button onClick={handleShare} className={`btn-hextech btn-hextech-secondary px-4 py-2 text-sm ${className}`}>
      {copied ? 'COPIED!' : 'SHARE RESULT'}
    </button>
  );
}
