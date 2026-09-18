'use client';

import { useState } from 'react';
import { Icon } from '../icons/Icon';
import { cn } from '@/lib/cn';

const CAMPO = [
  'w-full min-h-12 rounded-[var(--t-radius-md)] border border-line bg-surface pl-4 pr-12 py-3',
  'text-[0.95rem] text-ink placeholder:text-muted/50',
  'transition-colors focus:border-action focus:outline-none',
  'aria-[invalid=true]:border-action',
].join(' ');

export function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [mostrar, setMostrar] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={mostrar ? 'text' : 'password'}
        className={cn(CAMPO, props.className)}
      />
      <button
        type="button"
        onClick={() => setMostrar(!mostrar)}
        aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted hover:text-ink transition-colors"
      >
        <Icon name={mostrar ? 'eyeOff' : 'eye'} size={20} />
      </button>
    </div>
  );
}
