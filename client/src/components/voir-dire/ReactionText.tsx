import React from 'react';
import { Hand, ThumbsUp, ThumbsDown, StickyNote } from 'lucide-react';

interface ReactionTextProps {
  text: string;
  className?: string;
}

export function ReactionText({ text, className = '' }: ReactionTextProps) {
  if (text.startsWith('[Hand] ')) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <Hand className="w-3.5 h-3.5 text-yellow-600 shrink-0" />
        {text.slice(7)}
      </span>
    );
  }
  if (text.startsWith('[Nod] ')) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <ThumbsUp className="w-3.5 h-3.5 text-green-600 shrink-0" />
        {text.slice(6)}
      </span>
    );
  }
  if (text.startsWith('[Shake] ')) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <ThumbsDown className="w-3.5 h-3.5 text-red-600 shrink-0" />
        {text.slice(8)}
      </span>
    );
  }
  if (text.startsWith('[Note] ')) {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <StickyNote className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        {text.slice(7)}
      </span>
    );
  }
  return <>{text}</>;
}
