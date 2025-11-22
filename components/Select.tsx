
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  disabled = false,
  placeholder = 'Select...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  const selectedOption = options.find(opt => opt.value === value);

  // Calculate position and render via Portal
  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const dropdownHeight = Math.min(options.length * 45 + 10, 250); // approx max height with padding

        // Auto-flip logic: if less than 250px below and more space above, flip up
        const flipUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

        setDropdownStyle({
          position: 'fixed',
          left: rect.left,
          width: rect.width,
          top: flipUp ? 'auto' : rect.bottom + 4,
          bottom: flipUp ? viewportHeight - rect.top + 4 : 'auto',
          zIndex: 9999, // High z-index to ensure it floats above modals and other layers
          maxHeight: '250px'
        });
      }
    };

    if (isOpen) {
      updatePosition();
      // Capture scroll events from all parents to update position
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen, options.length]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      // Check if clicked trigger
      if (containerRef.current && containerRef.current.contains(event.target as Node)) {
        return;
      }
      
      // Check if clicked inside the dropdown portal
      const target = event.target as Element;
      if (target.closest('.select-dropdown-portal')) {
        return;
      }
      
      setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-between w-full gap-2 px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg transition-all ${
          disabled 
            ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800' 
            : 'hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-primary-300 dark:hover:border-primary-700 cursor-pointer shadow-sm'
        } ${isOpen ? 'ring-2 ring-primary-500/20 border-primary-500' : ''}`}
      >
        <span className={`truncate ${!selectedOption ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Icon 
          name="ChevronDown" 
          size={14} 
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && !disabled && createPortal(
        <div 
           className="select-dropdown-portal fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
           style={dropdownStyle}
        >
          <div className="overflow-y-auto p-1 custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex flex-col gap-0.5 ${
                  value === option.value
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className={`text-[10px] ${
                    value === option.value ? 'text-primary-500 dark:text-primary-400' : 'text-slate-400'
                  }`}>
                    {option.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
