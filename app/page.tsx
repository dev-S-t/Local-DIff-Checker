'use client';

import React, { useState, useRef, useEffect } from 'react';
import DiffViewer from '@/components/DiffViewer';
import { clsx } from 'clsx';
import { FileText, Folder, Type, Upload, X, CheckCircle2, ArrowRightLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import FolderDiff from '@/components/FolderDiff';
import ExportDiffButton from '@/components/ExportDiffButton';
import EnvChecker from '@/components/EnvChecker';
import { readFileContent } from '@/lib/fileUtils';

type Mode = 'text' | 'files' | 'folders' | 'env';

import { ThemeToggle } from '@/components/ThemeToggle';
import Image from 'next/image';

// ... (imports)

export default function Home() {
  const [mode, setMode] = useState<Mode>('text');
  
  // Text Mode State
  const [textLeft, setTextLeft] = useState('');
  const [textRight, setTextRight] = useState('');

  // File Mode State
  const [fileLeft, setFileLeft] = useState<File | null>(null);
  const [fileRight, setFileRight] = useState<File | null>(null);
  const [fileLeftContent, setFileLeftContent] = useState('');
  const [fileRightContent, setFileRightContent] = useState('');

  // Read files when selected
  const handleFileLeftChange = async (file: File | null) => {
    setFileLeft(file);
    if (file) {
      try {
        const content = await readFileContent(file);
        setFileLeftContent(content);
      } catch (e) {
        console.error(e);
        setFileLeftContent("Error reading file.");
      }
    } else {
      setFileLeftContent('');
    }
  };

  const handleFileRightChange = async (file: File | null) => {
    setFileRight(file);
    if (file) {
      try {
        const content = await readFileContent(file);
        setFileRightContent(content);
      } catch (e) {
        console.error(e);
        setFileRightContent("Error reading file.");
      }
    } else {
      setFileRightContent('');
    }
  };

  const handleSwapText = () => {
    setTextLeft(textRight);
    setTextRight(textLeft);
  };

  const handleSwapFiles = () => {
    setFileLeft(fileRight);
    setFileRight(fileLeft);
    setFileLeftContent(fileRightContent);
    setFileRightContent(fileLeftContent);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-100 dark:selection:bg-indigo-900/30 flex flex-col">
      
      {/* Header */}
      <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 relative rounded-lg overflow-hidden shadow-sm shadow-indigo-200 dark:shadow-none">
              <Image src="/logo.svg" alt="Local Diff Checker Logo" fill className="object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight leading-tight">Local Diff Checker</h1>
              <p className="text-[10px] text-neutral-500 font-medium hidden sm:block">100% Local • No Downloads • Full Privacy</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
              <TabButton active={mode === 'text'} onClick={() => setMode('text')} icon={<Type size={14} />}>Text</TabButton>
              <TabButton active={mode === 'files'} onClick={() => setMode('files')} icon={<FileText size={14} />}>Files</TabButton>
              <TabButton active={mode === 'folders'} onClick={() => setMode('folders')} icon={<Folder size={14} />}>Folders</TabButton>
              <TabButton active={mode === 'env'} onClick={() => setMode('env')} icon={<FileText size={14} />}>Env Checker</TabButton>
            </div>
            <div className="pl-2 border-l border-neutral-200 dark:border-neutral-800 ml-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        
        <AnimatePresence mode="wait">
          {mode === 'text' && (
            <motion.div 
              key="text"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 h-[400px]">
                <div className="flex flex-col gap-2 h-full">
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Original Text</label>
                  <textarea 
                    className="flex-1 w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                    placeholder="Paste original text here..."
                    value={textLeft}
                    onChange={(e) => setTextLeft(e.target.value)}
                  />
                </div>
                
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center z-10 mt-3">
                  <button 
                    onClick={handleSwapText} 
                    title="Swap text"
                    className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-2 h-full">
                  <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Modified Text</label>
                  <textarea 
                    className="flex-1 w-full p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all shadow-sm"
                    placeholder="Paste modified text here..."
                    value={textRight}
                    onChange={(e) => setTextRight(e.target.value)}
                  />
                </div>
              </div>

              {(textLeft || textRight) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Differences</h2>
                  </div>
                  <DiffViewer oldText={textLeft} newText={textRight} />
                  <div className="flex justify-end">
                    <ExportDiffButton oldText={textLeft} newText={textRight} filename="text.txt" />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'files' && (
            <motion.div 
              key="files"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileDropZone 
                  label="Original File" 
                  file={fileLeft} 
                  onFileSelect={handleFileLeftChange} 
                />
                
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center z-10 mt-3">
                  <button 
                    onClick={handleSwapFiles} 
                    title="Swap files"
                    className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <ArrowRightLeft size={16} />
                  </button>
                </div>

                <FileDropZone 
                  label="Modified File" 
                  file={fileRight} 
                  onFileSelect={handleFileRightChange} 
                />
              </div>

              {(fileLeftContent || fileRightContent) && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Differences</h2>
                  </div>
                  <DiffViewer oldText={fileLeftContent} newText={fileRightContent} />
                  <div className="flex justify-end">
                    <ExportDiffButton oldText={fileLeftContent} newText={fileRightContent} filename={fileRight?.name || fileLeft?.name || 'file.txt'} />
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {mode === 'folders' && (
            <motion.div 
              key="folders"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <FolderDiff />
            </motion.div>
          )}
          {mode === 'env' && (
          <motion.div
            key="env"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <EnvChecker />
          </motion.div>
        )}
      </AnimatePresence>

      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-neutral-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <p>
                <strong>Privacy Notice:</strong> No data is sent to any server. Everything runs locally in your browser.
              </p>
            </div>
            <div className="text-center md:text-right">
              <p>Developed by <span className="font-medium text-neutral-900 dark:text-neutral-200">dev-S-t</span></p>
              <a href="mailto:dev.sahil.tomar@gmail.com" className="text-xs hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">dev.sahil.tomar@gmail.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TabButton({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
        active 
          ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm" 
          : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function FileDropZone({ label, file, onFileSelect }: { label: string; file: File | null; onFileSelect: (f: File | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={clsx(
          "relative h-48 rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3",
          isDragOver 
            ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10" 
            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900"
        )}
      >
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        />
        
        {file ? (
          <>
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center">
              <FileText size={24} />
            </div>
            <div className="text-center px-4">
              <p className="font-medium text-sm truncate max-w-[200px]">{file.name}</p>
              <p className="text-xs text-neutral-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              className="absolute top-2 right-2 p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-400 hover:text-red-500 transition-colors"
            >
              <X size={16} />
            </button>
          </>
        ) : (
          <>
            <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 text-neutral-400 rounded-full flex items-center justify-center">
              <Upload size={24} />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm text-neutral-600 dark:text-neutral-300">Click to upload or drag and drop</p>
              <p className="text-xs text-neutral-400 mt-1">Any text file</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
