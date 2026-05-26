'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { clsx } from 'clsx';

interface EnvVar {
  key: string;
  values: { value: string; line: number }[];
}

interface ParsedEnv {
  [key: string]: EnvVar;
}

function parseEnvContent(content: string): ParsedEnv {
  const lines = content.split('\n');
  const result: ParsedEnv = {};

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    
    // Ignore empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) return;

    let key = '';
    let value = '';

    // Check for YAML-like format: KEY: "VALUE" or KEY: VALUE
    const yamlMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*:\s*(.*)$/);
    if (yamlMatch) {
      key = yamlMatch[1];
      value = yamlMatch[2];
    } else {
      // Check for ENV format: KEY=VALUE
      const envMatch = trimmed.match(/^([a-zA-Z0-9_.-]+)\s*=\s*(.*)$/);
      if (envMatch) {
        key = envMatch[1];
        value = envMatch[2];
      }
    }

    if (key) {
      // Clean up quotes from value
      value = value.trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.substring(1, value.length - 1);
      }

      if (!result[key]) {
        result[key] = { key, values: [] };
      }
      result[key].values.push({ value, line: lineNumber });
    }
  });

  return result;
}

type FilterType = 'all' | 'match' | 'differs' | 'missing';

export default function EnvChecker() {
  const [leftContent, setLeftContent] = useState('');
  const [rightContent, setRightContent] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');

  const leftParsed = parseEnvContent(leftContent);
  const rightParsed = parseEnvContent(rightContent);

  const allKeys = Array.from(new Set([...Object.keys(leftParsed), ...Object.keys(rightParsed)])).sort();

  const filteredKeys = allKeys.filter(key => {
    const left = leftParsed[key];
    const right = rightParsed[key];
    
    const isMissingLeft = !left;
    const isMissingRight = !right;
    
    const leftVals = left ? left.values.map(v => v.value).sort().join(',') : '';
    const rightVals = right ? right.values.map(v => v.value).sort().join(',') : '';
    const isMatch = leftVals === rightVals && !isMissingLeft && !isMissingRight;
    const isMissing = isMissingLeft || isMissingRight;
    const isDiffers = !isMatch && !isMissing;

    if (filter === 'all') return true;
    if (filter === 'match') return isMatch;
    if (filter === 'differs') return isDiffers;
    if (filter === 'missing') return isMissing;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px]">
        <EnvInput 
          label="Original Env" 
          value={leftContent} 
          onChange={setLeftContent} 
          placeholder="Paste .env or .yaml content here, or drop a file..."
        />
        <EnvInput 
          label="Modified Env" 
          value={rightContent} 
          onChange={setRightContent} 
          placeholder="Paste .env or .yaml content here, or drop a file..."
        />
      </div>

      {(leftContent || rightContent) && (
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Environment Variables Comparison</h2>
            <div className="flex gap-2 text-sm">
              <button 
                onClick={() => setFilter(filter === 'match' ? 'all' : 'match')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  filter === 'match' ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <CheckCircle2 size={14} className={filter === 'match' ? "" : "text-emerald-500"}/> Match
              </button>
              <button 
                onClick={() => setFilter(filter === 'differs' ? 'all' : 'differs')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  filter === 'differs' ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <AlertTriangle size={14} className={filter === 'differs' ? "" : "text-amber-500"}/> Differs
              </button>
              <button 
                onClick={() => setFilter(filter === 'missing' ? 'all' : 'missing')}
                className={clsx(
                  "flex items-center gap-1 px-2 py-1 rounded-md transition-colors",
                  filter === 'missing' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <Info size={14} className={filter === 'missing' ? "" : "text-blue-500"}/> Missing
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-neutral-50 dark:bg-neutral-950/50 text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <tr>
                  <th className="px-4 py-3 font-medium w-1/3">Variable Key</th>
                  <th className="px-4 py-3 font-medium w-1/3">Original Value (Line)</th>
                  <th className="px-4 py-3 font-medium w-1/3">Modified Value (Line)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredKeys.map(key => {
                  const left = leftParsed[key];
                  const right = rightParsed[key];
                  
                  const isMissingLeft = !left;
                  const isMissingRight = !right;
                  
                  // Simple comparison: check if the sets of values are identical
                  const leftVals = left ? left.values.map(v => v.value).sort().join(',') : '';
                  const rightVals = right ? right.values.map(v => v.value).sort().join(',') : '';
                  const isMatch = leftVals === rightVals && !isMissingLeft && !isMissingRight;

                  return (
                    <tr key={key} className={clsx(
                      "hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors",
                      isMatch ? "" : "bg-amber-50/30 dark:bg-amber-900/10"
                    )}>
                      <td className="px-4 py-3 font-mono text-xs font-medium">
                        <div className="flex items-center gap-2">
                          {isMatch ? <CheckCircle2 size={14} className="text-emerald-500" /> : 
                           (isMissingLeft || isMissingRight) ? <Info size={14} className="text-blue-500" /> : 
                           <AlertTriangle size={14} className="text-amber-500" />}
                          {key}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {isMissingLeft ? (
                          <span className="text-neutral-400 italic">Missing</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {left.values.map((v, i) => (
                              <div key={i} className="flex justify-between items-start group">
                                <span className={clsx("break-all", !isMatch && "text-amber-700 dark:text-amber-400")}>{v.value || '""'}</span>
                                <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 rounded ml-2 whitespace-nowrap">L{v.line}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {isMissingRight ? (
                          <span className="text-neutral-400 italic">Missing</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {right.values.map((v, i) => (
                              <div key={i} className="flex justify-between items-start group">
                                <span className={clsx("break-all", !isMatch && "text-amber-700 dark:text-amber-400")}>{v.value || '""'}</span>
                                <span className="text-[10px] text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-1.5 rounded ml-2 whitespace-nowrap">L{v.line}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredKeys.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-neutral-500">
                      {allKeys.length === 0 ? "No valid environment variables found." : "No variables match the selected filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function EnvInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) readFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const readFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target?.result as string || '');
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <Upload size={12} /> Upload File
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".env, .yaml, .yml, .txt" />
      </div>
      <div 
        className={clsx(
          "flex-1 relative rounded-xl border transition-all overflow-hidden shadow-sm",
          isDragOver ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-neutral-200 dark:border-neutral-800"
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <textarea 
          className="w-full h-full p-4 bg-white dark:bg-neutral-900 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {isDragOver && (
          <div className="absolute inset-0 bg-indigo-50/90 dark:bg-indigo-900/90 flex items-center justify-center backdrop-blur-sm">
            <div className="flex flex-col items-center text-indigo-600 dark:text-indigo-400">
              <Upload size={32} className="mb-2" />
              <span className="font-medium">Drop file to load</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
