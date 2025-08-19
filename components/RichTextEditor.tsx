import React, { useRef, useCallback } from 'react';
import { BoldIcon, ItalicIcon, ListIcon, ListOrderedIcon, UnderlineIcon } from './Icons';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
}

const ToolbarButton: React.FC<{ onMouseDown: (e: React.MouseEvent) => void, children: React.ReactNode, 'aria-label': string }> = ({ onMouseDown, children, 'aria-label': ariaLabel }) => (
    <button
        type="button"
        onMouseDown={onMouseDown}
        aria-label={ariaLabel}
        className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-pink-500"
    >
        {children}
    </button>
);


export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, placeholder, label }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const handleCommand = useCallback((command: string) => {
    document.execCommand(command, false);
    if(editorRef.current) {
        editorRef.current.focus();
    }
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };
  
  // Prevent default mousedown behavior to keep focus in the editor
  const onToolbarMouseDown = (e: React.MouseEvent, command: string) => {
      e.preventDefault();
      handleCommand(command);
  }

  return (
    <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
            <div className="flex items-center gap-1 p-1 border-b border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
                <ToolbarButton onMouseDown={(e) => onToolbarMouseDown(e, 'bold')} aria-label="Bold">
                    <BoldIcon className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton onMouseDown={(e) => onToolbarMouseDown(e, 'italic')} aria-label="Italic">
                    <ItalicIcon className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton onMouseDown={(e) => onToolbarMouseDown(e, 'underline')} aria-label="Underline">
                    <UnderlineIcon className="w-5 h-5" />
                </ToolbarButton>
                 <div className="w-px h-6 bg-gray-300 dark:bg-gray-500 mx-1"></div>
                <ToolbarButton onMouseDown={(e) => onToolbarMouseDown(e, 'insertUnorderedList')} aria-label="Unordered List">
                    <ListIcon className="w-5 h-5" />
                </ToolbarButton>
                <ToolbarButton onMouseDown={(e) => onToolbarMouseDown(e, 'insertOrderedList')} aria-label="Ordered List">
                    <ListOrderedIcon className="w-5 h-5" />
                </ToolbarButton>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                dangerouslySetInnerHTML={{ __html: value }}
                className="prose dark:prose-invert max-w-none w-full p-3 min-h-[150px] focus:outline-none"
                data-placeholder={placeholder}
                style={{
                    '--tw-prose-bullets': 'var(--brand-pink)',
                    '--tw-prose-counters': 'var(--brand-pink)'
                } as React.CSSProperties}
            ></div>
        </div>
    </div>
  );
};