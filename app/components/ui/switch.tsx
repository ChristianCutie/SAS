import React from 'react';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

const Switch: React.FC<SwitchProps> = ({
  checked,
  onCheckedChange,
  disabled = false,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`
        relative inline-flex h-7 w-12 items-center rounded-full
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-blue-500 focus-visible:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-emerald-500' : 'bg-slate-300'}
        ${className}
      `}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`
          inline-block h-5 w-5 transform rounded-full bg-white
          transition-transform shadow-md
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};

export default Switch;
