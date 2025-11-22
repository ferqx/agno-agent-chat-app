
import React, { ReactNode } from 'react';
import { Icon } from './Icon';

interface DataListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => ReactNode;
  keyExtractor: (item: T) => string;
  emptyState?: ReactNode;
  emptyMessage?: string;
  onClearSearch?: () => void;
  isSearching?: boolean;
  className?: string;
}

export const DataList = <T,>({
  data,
  renderItem,
  keyExtractor,
  emptyState,
  emptyMessage = "No items found.",
  onClearSearch,
  isSearching = false,
  className = ''
}: DataListProps<T>) => {
  
  if (data.length === 0) {
    return (
      <div className={`flex-1 flex flex-col items-center justify-center text-center py-12 text-slate-400 ${className}`}>
        {emptyState ? (
          emptyState
        ) : (
          <>
            <Icon name="FileText" size={48} className="mx-auto mb-4 opacity-20" />
            <p>{isSearching ? 'No items match your search.' : emptyMessage}</p>
            {isSearching && onClearSearch && (
              <button
                onClick={onClearSearch}
                className="text-primary-500 text-xs mt-2 hover:underline"
              >
                Clear search
              </button>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className={`flex-1 overflow-y-auto space-y-3 pb-2 ${className}`}>
      {data.map((item, index) => (
        <React.Fragment key={keyExtractor(item)}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}
    </div>
  );
};
