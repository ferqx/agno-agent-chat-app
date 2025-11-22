
import React from 'react';
import { Icon } from './Icon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onNext: () => void;
  onPrev: () => void;
  translations: {
    showing: string;
    to: string;
    of: string;
    items: string;
    page: string;
  };
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onNext,
  onPrev,
  translations,
  className = ''
}) => {
  if (totalPages <= 1) return null;

  const startItemIndex = (currentPage - 1) * itemsPerPage + 1;
  const endItemIndex = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 mt-2 ${className}`}>
      <div className="text-xs text-slate-500 dark:text-slate-400">
        {translations.showing} <span className="font-medium text-slate-900 dark:text-white">{startItemIndex}</span> {translations.to} <span className="font-medium text-slate-900 dark:text-white">{endItemIndex}</span> {translations.of} <span className="font-medium text-slate-900 dark:text-white">{totalItems}</span> {translations.items}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          disabled={currentPage === 1}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="ChevronLeft" size={16} />
        </button>

        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 px-2">
          {translations.page} {currentPage} {translations.of} {totalPages}
        </span>

        <button
          onClick={onNext}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Icon name="ChevronRight" size={16} />
        </button>
      </div>
    </div>
  );
};
