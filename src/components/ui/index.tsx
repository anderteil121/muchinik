import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export function Button({ className, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const base = "inline-flex items-center justify-center rounded-sm font-serif px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-red-900 text-red-50 hover:bg-red-800 border border-red-950 shadow-md",
    secondary: "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 shadow-sm",
    danger: "bg-zinc-900 text-red-500 border border-red-900/50 hover:bg-zinc-800",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input 
      className={cn("w-full bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-zinc-200 focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900/50 placeholder:text-zinc-600 transition-colors", className)} 
      {...props} 
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select 
      className={cn("w-full bg-zinc-950 border border-zinc-800 rounded-sm px-3 py-2 text-zinc-200 focus:outline-none focus:border-red-900 focus:ring-1 focus:ring-red-900/50", className)} 
      {...props} 
    />
  );
}

export function Modal({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-red-900/30 shadow-2xl shadow-red-900/20 w-full max-w-md rounded-md overflow-hidden">
        <div className="flex justify-between items-center px-4 py-3 border-b border-zinc-800/50 bg-zinc-950/50">
          <h2 className="font-serif text-lg text-amber-500/90 font-medium">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

import { createPortal } from 'react-dom';

export function Tooltip({ content, children, align = 'right' }: { content: React.ReactNode, children: React.ReactElement, align?: 'left' | 'right' }) {
  const [rect, setRect] = React.useState<DOMRect | null>(null);

  return (
    <>
      {React.cloneElement(children, {
        onMouseEnter: (e: React.MouseEvent) => {
          setRect(e.currentTarget.getBoundingClientRect());
          if (children.props.onMouseEnter) children.props.onMouseEnter(e);
        },
        onMouseLeave: (e: React.MouseEvent) => {
          setRect(null);
          if (children.props.onMouseLeave) children.props.onMouseLeave(e);
        },
        // We ensure group hover classes still work by wrapping or maintaining the class
      })}
      {rect && typeof window !== 'undefined' && createPortal(
        <div 
          className="fixed z-[99999] max-w-xs w-max bg-zinc-900 border border-zinc-700 p-2 text-xs text-zinc-300 rounded-sm shadow-2xl pointer-events-none animate-in fade-in duration-100"
          style={{
            top: rect.top + rect.height / 2,
            left: align === 'left' ? rect.left - 8 : rect.right + 8,
            transform: align === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)'
          }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
}
