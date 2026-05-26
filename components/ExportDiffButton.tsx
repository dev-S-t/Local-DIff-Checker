'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { createPatch } from 'diff';
import { clsx } from 'clsx';

interface ExportDiffButtonProps {
  oldText?: string;
  newText?: string;
  filename?: string;
  getDiffs?: () => Promise<{ path: string; oldText: string; newText: string }[]>;
  className?: string;
}

export default function ExportDiffButton({ oldText, newText, filename = 'file.txt', getDiffs, className }: ExportDiffButtonProps) {
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleCopy = async () => {
    setIsExporting(true);
    try {
      let diffString = '';

      if (getDiffs) {
        const diffs = await getDiffs();
        diffString = diffs.map(d => createPatch(d.path, d.oldText, d.newText)).join('\n\n');
      } else if (oldText !== undefined && newText !== undefined) {
        diffString = createPatch(filename, oldText, newText);
      }

      if (!diffString) {
        diffString = 'No differences found.';
      }

      await navigator.clipboard.writeText(diffString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy diff:', err);
      alert('Failed to copy diff to clipboard.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={isExporting}
      className={clsx(
        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        copied 
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50",
        isExporting && "opacity-70 cursor-not-allowed",
        className
      )}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
      {isExporting ? 'Preparing...' : copied ? 'Copied for LLM!' : 'Copy Diff for LLM'}
    </button>
  );
}
