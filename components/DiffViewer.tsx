'use client';

import React, { useMemo, useState } from 'react';
import { diffLines, Change } from 'diff';
import { clsx } from 'clsx';
import { Columns, LayoutList, CheckCircle2, ChevronDown, FoldVertical, UnfoldVertical } from 'lucide-react';

interface DiffViewerProps {
  oldText: string;
  newText: string;
  initialViewType?: 'split' | 'unified';
}

export default function DiffViewer({ oldText, newText, initialViewType = 'split' }: DiffViewerProps) {
  const [viewType, setViewType] = useState<'split' | 'unified'>(initialViewType);
  const [isExpanded, setIsExpanded] = useState(false);
  const diff = useMemo(() => diffLines(oldText, newText), [oldText, newText]);

  const isIdentical = oldText === newText;

  if (isIdentical) {
    const lines = oldText.split('\n');
    const previewLines = isExpanded ? lines : lines.slice(0, 5);
    
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-center p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <h3 className="text-lg font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
            <CheckCircle2 className="text-emerald-500" />
            Identical Files
          </h3>
        </div>
        
        <div className="relative font-mono text-xs md:text-sm border rounded-lg overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {previewLines.map((line, idx) => (
              <div key={idx} className="flex hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                <div className="w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none text-neutral-400 border-r border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  {idx + 1}
                </div>
                <div className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
                  {line || ' '}
                </div>
              </div>
            ))}
          </div>
          
          {!isExpanded && lines.length > 5 && (
            <>
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-neutral-900 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-2">
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-xs font-medium text-neutral-600 dark:text-neutral-300 shadow-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors z-10"
                >
                  <ChevronDown size={14} />
                  Expand full file
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
          <button
            onClick={() => setViewType('split')}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              viewType === 'split'
                ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            <Columns size={14} />
            Split
          </button>
          <button
            onClick={() => setViewType('unified')}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              viewType === 'unified'
                ? "bg-white dark:bg-neutral-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            <LayoutList size={14} />
            Unified
          </button>
        </div>
      </div>

      {viewType === 'split' ? (
        <SplitView diff={diff} />
      ) : (
        <UnifiedView diff={diff} />
      )}
    </div>
  );
}

function useGroupedRows<T>(
  rows: T[],
  isChange: (row: T) => boolean,
  contextLines: number = 5
) {
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());

  const { groups, hasCollapsible, hasExpanded } = useMemo(() => {
    const visible = new Set<number>();
    rows.forEach((row, i) => {
      if (isChange(row)) {
        for (let j = Math.max(0, i - contextLines); j <= Math.min(rows.length - 1, i + contextLines); j++) {
          visible.add(j);
        }
      }
    });

    const grps: ({ type: 'visible', rows: T[], startIndex: number } | { type: 'collapsed', rows: T[], startIndex: number })[] = [];
    let currentGroup: { type: 'visible' | 'collapsed', rows: T[], startIndex: number } | null = null;

    let hasCollapsible = false;
    let hasExpanded = false;

    rows.forEach((row, i) => {
      const isNaturallyVisible = visible.has(i);
      if (!isNaturallyVisible) {
        hasCollapsible = true;
      }
      
      const isExpanded = expandedBlocks.has(i);
      if (!isNaturallyVisible && isExpanded) {
        hasExpanded = true;
      }

      const isVisible = isNaturallyVisible || isExpanded;
      const type = isVisible ? 'visible' : 'collapsed';

      if (!currentGroup || currentGroup.type !== type) {
        if (currentGroup) grps.push(currentGroup);
        currentGroup = { type, rows: [row], startIndex: i };
      } else {
        currentGroup.rows.push(row);
      }
    });
    if (currentGroup) grps.push(currentGroup);

    return { groups: grps, hasCollapsible, hasExpanded };
  }, [rows, expandedBlocks, contextLines]);

  const expandGroup = (startIndex: number, length: number) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      for (let i = startIndex; i < startIndex + length; i++) {
        next.add(i);
      }
      return next;
    });
  };

  const collapseAll = () => setExpandedBlocks(new Set());
  const expandAll = () => {
    const all = new Set<number>();
    for (let i = 0; i < rows.length; i++) all.add(i);
    setExpandedBlocks(all);
  };

  return { groups, expandGroup, collapseAll, expandAll, hasCollapsible, hasExpanded };
}

function SplitView({ diff }: { diff: Change[] }) {
  // We need to align the changes side-by-side.
  // This is a bit tricky because a change in one side might not align perfectly with the other if we just map.
  // A simple approach for split view:
  // Iterate through changes.
  // If added: show on right, empty on left.
  // If removed: show on left, empty on right.
  // If no change: show on both.
  
  const rows = useMemo(() => {
    const r: { left?: { line: string; num: number; type: 'removed' | 'neutral' }; right?: { line: string; num: number; type: 'added' | 'neutral' } }[] = [];
    
    let leftLineNum = 1;
    let rightLineNum = 1;

    diff.forEach((part) => {
      const lines = part.value.replace(/\n$/, '').split('\n');
      
      if (part.added) {
        lines.forEach((line) => {
          r.push({
            right: { line, num: rightLineNum++, type: 'added' },
          });
        });
      } else if (part.removed) {
        lines.forEach((line) => {
          r.push({
            left: { line, num: leftLineNum++, type: 'removed' },
          });
        });
      } else {
        lines.forEach((line) => {
          r.push({
            left: { line, num: leftLineNum++, type: 'neutral' },
            right: { line, num: rightLineNum++, type: 'neutral' },
          });
        });
      }
    });
    return r;
  }, [diff]);

  const { groups, expandGroup, collapseAll, expandAll, hasCollapsible, hasExpanded } = useGroupedRows(
    rows,
    (row) => row.left?.type === 'removed' || row.right?.type === 'added',
    5
  );

  return (
    <div className="relative font-mono text-xs md:text-sm border rounded-lg overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      {hasCollapsible && (
        <button
          onClick={hasExpanded ? collapseAll : expandAll}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full shadow-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all font-sans text-sm font-medium"
        >
          {hasExpanded ? (
            <>
              <FoldVertical size={14} />
              Collapse All
            </>
          ) : (
            <>
              <UnfoldVertical size={14} />
              Expand All
            </>
          )}
        </button>
      )}
      <div className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
        <div className="p-2 text-center text-neutral-500 font-medium">Original</div>
        <div className="p-2 text-center text-neutral-500 font-medium">Modified</div>
      </div>
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {groups.map((group, gIdx) => {
          if (group.type === 'collapsed') {
            return (
              <div 
                key={`collapse-${group.startIndex}`} 
                onClick={() => expandGroup(group.startIndex, group.rows.length)}
                className="flex flex-col items-center justify-center py-3 bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-800 relative group/collapse cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
                <span className="text-xs text-neutral-500 font-medium flex items-center gap-2">
                  <ChevronDown size={14} />
                  {group.rows.length} identical lines
                  <ChevronDown size={14} />
                </span>
              </div>
            );
          }

          return group.rows.map((row, idx) => {
            const actualIdx = group.startIndex + idx;
            return (
              <div key={actualIdx} className="grid grid-cols-2 divide-x divide-neutral-200 dark:divide-neutral-800 group hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors">
                {/* Left Side */}
                <div className={clsx(
                  "flex min-w-0",
                  row.left?.type === 'removed' ? "bg-red-50 dark:bg-red-900/20" : ""
                )}>
                  <div className="w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/50 border-r border-neutral-100 dark:border-neutral-800">
                    {row.left?.num}
                  </div>
                  <div className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all overflow-hidden">
                    {row.left?.line || <span className="select-none">&nbsp;</span>}
                  </div>
                </div>

                {/* Right Side */}
                <div className={clsx(
                  "flex min-w-0",
                  row.right?.type === 'added' ? "bg-green-50 dark:bg-green-900/20" : ""
                )}>
                  <div className="w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none text-neutral-400 bg-neutral-50/50 dark:bg-neutral-900/50 border-r border-neutral-100 dark:border-neutral-800">
                    {row.right?.num}
                  </div>
                  <div className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all overflow-hidden">
                    {row.right?.line || <span className="select-none">&nbsp;</span>}
                  </div>
                </div>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}

function UnifiedView({ diff }: { diff: Change[] }) {
  // Unified view: show all lines in one column.
  // Removed lines first, then added lines.
  
  const rows = useMemo(() => {
    const r: { line: string; leftNum?: number; rightNum?: number; type: 'added' | 'removed' | 'neutral' }[] = [];
    
    let leftLineNum = 1;
    let rightLineNum = 1;

    diff.forEach((part) => {
      const lines = part.value.replace(/\n$/, '').split('\n');
      if (part.added) {
        lines.forEach((line) => {
          r.push({ line, rightNum: rightLineNum++, type: 'added' });
        });
      } else if (part.removed) {
        lines.forEach((line) => {
          r.push({ line, leftNum: leftLineNum++, type: 'removed' });
        });
      } else {
        lines.forEach((line) => {
          r.push({ line, leftNum: leftLineNum++, rightNum: rightLineNum++, type: 'neutral' });
        });
      }
    });
    return r;
  }, [diff]);

  const { groups, expandGroup, collapseAll, expandAll, hasCollapsible, hasExpanded } = useGroupedRows(
    rows,
    (row) => row.type === 'added' || row.type === 'removed',
    5
  );

  return (
    <div className="relative font-mono text-xs md:text-sm border rounded-lg overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
      {hasCollapsible && (
        <button
          onClick={hasExpanded ? collapseAll : expandAll}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full shadow-xl hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all font-sans text-sm font-medium"
        >
          {hasExpanded ? (
            <>
              <FoldVertical size={14} />
              Collapse All
            </>
          ) : (
            <>
              <UnfoldVertical size={14} />
              Expand All
            </>
          )}
        </button>
      )}
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {groups.map((group, gIdx) => {
          if (group.type === 'collapsed') {
            return (
              <div 
                key={`collapse-${group.startIndex}`} 
                onClick={() => expandGroup(group.startIndex, group.rows.length)}
                className="flex flex-col items-center justify-center py-3 bg-neutral-50 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-800 relative group/collapse cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/5 dark:from-white/5 to-transparent pointer-events-none" />
                <span className="text-xs text-neutral-500 font-medium flex items-center gap-2">
                  <ChevronDown size={14} />
                  {group.rows.length} identical lines
                  <ChevronDown size={14} />
                </span>
              </div>
            );
          }

          return group.rows.map((row, idx) => {
            const actualIdx = group.startIndex + idx;
            return (
              <div key={actualIdx} className={clsx(
                "flex hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors",
                row.type === 'added' ? "bg-green-50 dark:bg-green-900/20" : 
                row.type === 'removed' ? "bg-red-50 dark:bg-red-900/20" : ""
              )}>
                <div className="w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none text-neutral-400 border-r border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  {row.leftNum}
                </div>
                <div className="w-10 flex-shrink-0 text-right pr-2 py-0.5 select-none text-neutral-400 border-r border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                  {row.rightNum}
                </div>
                <div className="flex-1 px-2 py-0.5 whitespace-pre-wrap break-all">
                  {row.type === 'added' && <span className="text-green-600 dark:text-green-400 mr-1">+</span>}
                  {row.type === 'removed' && <span className="text-red-600 dark:text-red-400 mr-1">-</span>}
                  {row.type === 'neutral' && <span className="text-transparent mr-1"> </span>}
                  {row.line}
                </div>
              </div>
            );
          });
        })}
      </div>
    </div>
  );
}

