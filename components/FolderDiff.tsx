'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Folder, FileText, ChevronRight, ChevronDown, AlertCircle, CheckCircle2, ArrowRightLeft, FoldVertical } from 'lucide-react';
import { clsx } from 'clsx';
import DiffViewer from './DiffViewer';
import ExportDiffButton from './ExportDiffButton';
import { readFileContent } from '@/lib/fileUtils';

interface FolderDiffProps {
  // We handle upload internally or pass files? 
  // Let's handle upload internally for simplicity in this component
}

type FileStatus = 'added' | 'removed' | 'modified' | 'unchanged';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  status?: FileStatus;
  children?: Record<string, FileNode>; // Using map for easier lookup during construction
  fileLeft?: File;
  fileRight?: File;
}

export default function FolderDiff() {
  const [leftFiles, setLeftFiles] = useState<FileList | null>(null);
  const [rightFiles, setRightFiles] = useState<FileList | null>(null);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [leftContent, setLeftContent] = useState('');
  const [rightContent, setRightContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [collapseSignal, setCollapseSignal] = useState(0);

  // Process files when both inputs are set
  useEffect(() => {
    if (!leftFiles || !rightFiles) return;

    const processFiles = async () => {
      setIsProcessing(true);
      const tree: Record<string, FileNode> = {};

      const getPathParts = (path: string) => path.split('/');

      const addToTree = (file: File, side: 'left' | 'right') => {
        const path = file.webkitRelativePath;
        const parts = getPathParts(path);
        // parts[0] is the folder name itself, usually we want to ignore the root folder name difference
        // if users upload "v1" and "v2", we want to compare contents.
        // So let's strip the first part (root folder name) to compare relative structure.
        const relativePathParts = parts.slice(1);
        
        let currentLevel = tree;
        
        relativePathParts.forEach((part, index) => {
          const isLast = index === relativePathParts.length - 1;
          const fullPath = relativePathParts.slice(0, index + 1).join('/');
          
          if (!currentLevel[part]) {
            currentLevel[part] = {
              name: part,
              path: fullPath,
              type: isLast ? 'file' : 'folder',
              children: {},
              status: 'unchanged' // Default, will be updated
            };
          }

          if (isLast) {
            if (side === 'left') currentLevel[part].fileLeft = file;
            else currentLevel[part].fileRight = file;
          } else {
            // It's a folder, move down
            currentLevel = currentLevel[part].children!;
          }
        });
      };

      // Add left files
      Array.from(leftFiles).forEach(f => addToTree(f, 'left'));
      // Add right files
      Array.from(rightFiles).forEach(f => addToTree(f, 'right'));

      // Now determine status recursively
      const calculateStatus = async (node: FileNode): Promise<FileStatus> => {
        if (node.type === 'folder') {
          const children = Object.values(node.children || {});
          let hasAdded = false;
          let hasRemoved = false;
          let hasModified = false;

          for (const child of children) {
            const childStatus = await calculateStatus(child);
            if (childStatus === 'added') hasAdded = true;
            if (childStatus === 'removed') hasRemoved = true;
            if (childStatus === 'modified') hasModified = true;
          }

          if (hasModified) node.status = 'modified';
          else if (hasAdded && hasRemoved) node.status = 'modified'; // Mixed changes
          else if (hasAdded) node.status = 'added'; // Only added children (if folder itself is new? logic tricky here)
          else if (hasRemoved) node.status = 'removed';
          else node.status = 'unchanged';
          
          // Actually for folders, if it contains modified files, it's modified.
          // If it contains only added files, it's effectively "added" or "modified" depending on view.
          // Let's simplify: if any child is not unchanged, folder is modified.
          if (hasAdded || hasRemoved || hasModified) node.status = 'modified';
          
          return node.status!;
        } else {
          // It's a file
          if (node.fileLeft && !node.fileRight) {
            node.status = 'removed';
          } else if (!node.fileLeft && node.fileRight) {
            node.status = 'added';
          } else if (node.fileLeft && node.fileRight) {
            // Compare content
            // Optimization: check size first
            if (node.fileLeft.size !== node.fileRight.size) {
              node.status = 'modified';
            } else {
              // Read content to be sure
              // For large number of files, this is slow. 
              // Let's do a quick check or just mark as 'potentially modified' if we want to be lazy.
              // But user wants "safety focused tool", accuracy is key.
              // Let's read text.
              try {
                const [t1, t2] = await Promise.all([
                  readFileContent(node.fileLeft),
                  readFileContent(node.fileRight)
                ]);
                node.status = t1 === t2 ? 'unchanged' : 'modified';
              } catch (e) {
                console.error("Error reading file", e);
                node.status = 'modified'; // Assume modified on error
              }
            }
          }
          return node.status!;
        }
      };

      // Convert tree object to array and process
      const rootNodes = Object.values(tree);
      for (const node of rootNodes) {
        await calculateStatus(node);
      }
      
      setFileTree(rootNodes);
      setIsProcessing(false);
    };

    processFiles();
  }, [leftFiles, rightFiles]);

  // Handle file selection
  const handleFileSelect = async (node: FileNode) => {
    setSelectedFile(node);
    
    // Read content
    try {
      let l = '', r = '';
      if (node.fileLeft) l = await readFileContent(node.fileLeft);
      if (node.fileRight) r = await readFileContent(node.fileRight);
      setLeftContent(l);
      setRightContent(r);
    } catch (e) {
      console.error("Error reading file content", e);
      setLeftContent('Error reading file');
      setRightContent('Error reading file');
    }
  };

  const getAllDiffs = async () => {
    const diffs: { path: string; oldText: string; newText: string }[] = [];

    const traverse = async (node: FileNode) => {
      if (node.type === 'folder') {
        if (node.children) {
          for (const child of Object.values(node.children)) {
            await traverse(child);
          }
        }
      } else {
        if (node.status !== 'unchanged') {
          let oldText = '';
          let newText = '';
          try {
            if (node.fileLeft) oldText = await readFileContent(node.fileLeft);
            if (node.fileRight) newText = await readFileContent(node.fileRight);
            diffs.push({ path: node.path, oldText, newText });
          } catch (e) {
            console.error('Error reading file for export', e);
          }
        }
      }
    };

    for (const node of fileTree) {
      await traverse(node);
    }

    return diffs;
  };

  const handleSwapFolders = () => {
    setLeftFiles(rightFiles);
    setRightFiles(leftFiles);
  };

  return (
    <div className="space-y-6">
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
        <FolderInput label="Original Folder" onChange={setLeftFiles} files={leftFiles} />
        
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center justify-center z-10 mt-3">
          <button 
            onClick={handleSwapFolders} 
            title="Swap folders"
            className="p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowRightLeft size={16} />
          </button>
        </div>

        <FolderInput label="Modified Folder" onChange={setRightFiles} files={rightFiles} />
      </div>

      {isProcessing && (
        <div className="text-center py-8 text-neutral-500 animate-pulse">
          Processing files...
        </div>
      )}

      {!isProcessing && fileTree.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
          {/* File Tree Sidebar */}
          <div className="lg:col-span-1 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900 flex flex-col">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 font-medium text-sm flex justify-between items-center">
              <span>File Structure</span>
              <button 
                onClick={() => setCollapseSignal(s => s + 1)}
                className="p-1 hover:bg-neutral-200 dark:hover:bg-neutral-800 rounded text-neutral-500 transition-colors"
                title="Collapse All"
              >
                <FoldVertical size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {fileTree.map((node) => (
                <TreeNode 
                  key={node.path} 
                  node={node} 
                  onSelect={handleFileSelect} 
                  selectedPath={selectedFile?.path} 
                  collapseSignal={collapseSignal}
                />
              ))}
            </div>
          </div>

          {/* Diff View Area */}
          <div className="lg:col-span-2 flex flex-col h-full border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-white dark:bg-neutral-900">
            {selectedFile ? (
              <div className="flex flex-col h-full">
                <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{selectedFile.path}</span>
                  <StatusBadge status={selectedFile.status} />
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedFile.status === 'unchanged' ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                      <CheckCircle2 size={32} className="mb-2" />
                      <p>Files are identical</p>
                    </div>
                  ) : (
                    <DiffViewer oldText={leftContent} newText={rightContent} />
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Select a file to view differences</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!isProcessing && fileTree.length > 0 && (
        <div className="flex justify-end">
          <ExportDiffButton getDiffs={getAllDiffs} />
        </div>
      )}
    </div>
  );
}

function FolderInput({ label, onChange, files }: { label: string; onChange: (f: FileList | null) => void; files: FileList | null }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
      <div 
        onClick={() => inputRef.current?.click()}
        className="h-32 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-white dark:bg-neutral-900 transition-all cursor-pointer flex flex-col items-center justify-center gap-2"
      >
        <input 
          ref={inputRef}
          type="file"
          // @ts-ignore - webkitdirectory is not in standard types yet
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={(e) => onChange(e.target.files)}
        />
        <Folder className={clsx("w-8 h-8", files ? "text-indigo-500" : "text-neutral-400")} />
        <div className="text-center">
          {files ? (
            <>
              <p className="font-medium text-sm">{files.length} files selected</p>
              <p className="text-xs text-neutral-400">Click to change</p>
            </>
          ) : (
            <p className="font-medium text-sm text-neutral-500">Click to select folder</p>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeNode({ node, onSelect, selectedPath, collapseSignal }: { node: FileNode; onSelect: (n: FileNode) => void; selectedPath?: string; collapseSignal?: number }) {
  const [isOpen, setIsOpen] = useState(true); // Default open for better visibility
  const hasChildren = node.type === 'folder' && node.children && Object.keys(node.children).length > 0;
  const isSelected = node.path === selectedPath;

  useEffect(() => {
    if (collapseSignal !== undefined && collapseSignal > 0) {
      setIsOpen(false);
    }
  }, [collapseSignal]);

  // Don't show unchanged files if we want to focus on diffs? 
  // For now show all.

  return (
    <div className="pl-2">
      <div 
        className={clsx(
          "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-sm select-none transition-colors",
          isSelected ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300" : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          node.status === 'modified' ? "text-amber-600 dark:text-amber-400" :
          node.status === 'added' ? "text-green-600 dark:text-green-400" :
          node.status === 'removed' ? "text-red-600 dark:text-red-400" :
          "text-neutral-700 dark:text-neutral-300"
        )}
        onClick={() => {
          if (node.type === 'file') onSelect(node);
          else setIsOpen(!isOpen);
        }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-0.5 hover:bg-black/5 rounded">
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : <span className="w-4" />}
        
        {node.type === 'folder' ? <Folder size={14} className="opacity-70" /> : <FileText size={14} className="opacity-70" />}
        <span className="truncate">{node.name}</span>
        
        {node.status !== 'unchanged' && (
          <span className={clsx(
            "ml-auto text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full",
            node.status === 'modified' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
            node.status === 'added' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          )}>
            {node.status === 'modified' ? 'M' : node.status === 'added' ? 'A' : 'D'}
          </span>
        )}
      </div>
      
      {hasChildren && isOpen && (
        <div className="border-l border-neutral-200 dark:border-neutral-800 ml-3.5">
          {Object.values(node.children!).map((child) => (
            <TreeNode key={child.path} node={child} onSelect={onSelect} selectedPath={selectedPath} collapseSignal={collapseSignal} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status?: FileStatus }) {
  if (!status || status === 'unchanged') return <span className="text-xs text-neutral-400 font-medium px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full">Unchanged</span>;
  
  const styles = {
    modified: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    added: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    removed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
  };

  return (
    <span className={clsx("text-xs font-medium px-2 py-1 rounded-full capitalize", styles[status])}>
      {status}
    </span>
  );
}

