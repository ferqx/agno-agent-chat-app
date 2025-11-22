
import React, { useRef, useState, useEffect } from 'react';
import { Icon } from './Icon';
import { Select } from './Select';
import { KnowledgeDocument, KnowledgeStatus, ChunkingStrategy, KnowledgeBaseItem } from '../types';
import { translations, Language } from '../translations';
import { ConfirmationModal } from './ConfirmationModal';
import { Tooltip } from './Tooltip';
import { Pagination } from './Pagination';
import { DataList } from './DataList';
import { StatusBadge, StatusType } from './StatusBadge';

interface KnowledgeBaseProps {
  knowledgeBases: KnowledgeBaseItem[];
  onCreateBase: (name: string, desc: string) => string;
  onUpdateBase: (id: string, name: string, desc: string) => void;
  onDeleteBase: (id: string) => void;
  documents: KnowledgeDocument[]; // All docs, but we usually filter by selected base
  onUpload: (baseId: string, file: File) => void;
  onDeleteDoc: (id: string) => void;
  onUpdateStrategy: (id: string, strategy: ChunkingStrategy) => void;
  onStartProcessing: (id: string) => void;
  
  // Batch Props
  onBatchDelete: (ids: string[]) => void;
  onBatchUpdateStrategy: (ids: string[], strategy: ChunkingStrategy) => void;
  onBatchStartProcessing: (ids: string[]) => void;
  
  storageUsed: number;
  language: Language;
}

type SortField = 'date' | 'name' | 'size';
type SortOrder = 'asc' | 'desc';

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({
  knowledgeBases,
  onCreateBase,
  onUpdateBase,
  onDeleteBase,
  documents,
  onUpload,
  onDeleteDoc,
  onUpdateStrategy,
  onStartProcessing,
  onBatchDelete,
  onBatchUpdateStrategy,
  onBatchStartProcessing,
  storageUsed,
  language
}) => {
  const [selectedBaseId, setSelectedBaseId] = useState<string | null>(knowledgeBases.length > 0 ? knowledgeBases[0].id : null);
  
  // Modal States
  const [isBaseModalOpen, setIsBaseModalOpen] = useState(false);
  const [editingBaseId, setEditingBaseId] = useState<string | null>(null); // If null, creating mode
  const [baseFormName, setBaseFormName] = useState('');
  const [baseFormDesc, setBaseFormDesc] = useState('');
  
  const [deleteBaseId, setDeleteBaseId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Batch Selection State
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = translations[language];

  // Ensure we have a valid selection if bases change
  useEffect(() => {
    if (!selectedBaseId && knowledgeBases.length > 0) {
      setSelectedBaseId(knowledgeBases[0].id);
    } else if (selectedBaseId && !knowledgeBases.find(b => b.id === selectedBaseId)) {
      setSelectedBaseId(knowledgeBases.length > 0 ? knowledgeBases[0].id : null);
    }
  }, [knowledgeBases, selectedBaseId]);

  // Reset states when base changes
  useEffect(() => {
    setSelectedDocIds([]);
    setSearchQuery('');
    setCurrentPage(1);
    setSortField('date');
    setSortOrder('desc');
  }, [selectedBaseId]);

  // Reset page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // 1. Filter Logic
  const filteredDocs = selectedBaseId 
  ? documents.filter(doc => {
      const matchesBase = doc.knowledgeBaseId === selectedBaseId;
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBase && matchesSearch;
    }) 
  : [];

  // 2. Sort Logic
  const sortedDocs = [...filteredDocs].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'date':
      default:
        // Use uploadedAt or a fallback
        comparison = (a.uploadedAt || 0) - (b.uploadedAt || 0);
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // 3. Pagination Logic
  const totalPages = Math.ceil(sortedDocs.length / itemsPerPage);
  const paginatedDocs = sortedDocs.slice(
    (currentPage - 1) * itemsPerPage, 
    currentPage * itemsPerPage
  );

  // Pagination Helpers
  const goToNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const goToPrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!selectedBaseId) return;
    const files = e.dataTransfer.files;
    handleFiles(files);
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !selectedBaseId) return;
    Array.from(files).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'txt', 'md'].includes(ext || '')) {
        onUpload(selectedBaseId, file);
      } else {
        alert('Only PDF, TXT, and MD files are supported.');
      }
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open Modal for Create
  const openCreateModal = () => {
    setEditingBaseId(null);
    setBaseFormName('');
    setBaseFormDesc('');
    setIsBaseModalOpen(true);
  };

  // Open Modal for Edit
  const openEditModal = (e: React.MouseEvent, base: KnowledgeBaseItem) => {
    e.stopPropagation();
    setEditingBaseId(base.id);
    setBaseFormName(base.name);
    setBaseFormDesc(base.description);
    setIsBaseModalOpen(true);
  };

  const handleBaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseFormName.trim()) return;

    if (editingBaseId) {
      onUpdateBase(editingBaseId, baseFormName.trim(), baseFormDesc.trim());
    } else {
      const newId = onCreateBase(baseFormName.trim(), baseFormDesc.trim());
      setSelectedBaseId(newId); // Auto select new base
    }
    
    setIsBaseModalOpen(false);
    setBaseFormName('');
    setBaseFormDesc('');
  };

  const toggleSelectAll = () => {
    if (selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map(d => d.id));
    }
  };

  const toggleSelectDoc = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(prev => prev.filter(dId => dId !== id));
    } else {
      setSelectedDocIds(prev => [...prev, id]);
    }
  };

  // Batch Action Handlers
  const handleBatchDelete = () => {
    if (confirm(t.deleteBaseMsg)) { // Reuse delete msg or create a new one
      onBatchDelete(selectedDocIds);
      setSelectedDocIds([]);
    }
  };

  const handleBatchParse = () => {
    onBatchStartProcessing(selectedDocIds);
    setSelectedDocIds([]);
  };

  const handleBatchStrategyChange = (strategy: string) => {
    onBatchUpdateStrategy(selectedDocIds, strategy as ChunkingStrategy);
    setSelectedDocIds([]);
  };

  const selectedBase = knowledgeBases.find(b => b.id === selectedBaseId);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const mapStatusToBadgeType = (status: KnowledgeStatus): StatusType => {
    switch (status) {
      case 'ready': return 'success';
      case 'error': return 'error';
      case 'uploaded': return 'warning'; // or 'neutral'
      case 'processing': 
      case 'indexing': 
      case 'uploading': return 'info';
      default: return 'neutral';
    }
  };

  const getStatusText = (status: KnowledgeStatus) => {
    switch(status) {
        case 'uploading': return t.uploading;
        case 'uploaded': return t.uploaded;
        case 'processing': return t.processing;
        case 'indexing': return t.indexing;
        case 'ready': return t.ready;
        case 'error': return t.error;
    }
  };
  
  const getStatusIcon = (status: KnowledgeStatus) => {
    switch(status) {
        case 'uploaded': return 'Clock';
        case 'processing': 
        case 'indexing': 
        case 'uploading': return 'Loader2';
        case 'ready': return 'CheckCircle2';
        case 'error': return 'AlertCircle';
        default: return undefined;
    }
  };

  const chunkingOptions = [
    { value: 'fixed', label: t.chunkingStrategies.fixed.title, description: t.chunkingStrategies.fixed.desc },
    { value: 'semantic', label: t.chunkingStrategies.semantic.title, description: t.chunkingStrategies.semantic.desc },
    { value: 'hierarchical', label: t.chunkingStrategies.hierarchical.title, description: t.chunkingStrategies.hierarchical.desc },
  ];

  // Render function for the DataList
  const renderDocItem = (doc: KnowledgeDocument) => (
    <div 
      className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm transition-all relative overflow-visible group z-10 ${
         selectedDocIds.includes(doc.id)
           ? 'bg-primary-50/50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800'
           : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:shadow-md'
      }`}
    >
      
      {/* Selection Checkbox */}
      <div className="flex items-center h-full" onClick={() => toggleSelectDoc(doc.id)}>
         <div className={`w-5 h-5 rounded-md border cursor-pointer flex items-center justify-center transition-colors ${
            selectedDocIds.includes(doc.id)
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-primary-400'
         }`}>
            {selectedDocIds.includes(doc.id) && <Icon name="Check" size={12} />}
         </div>
      </div>

      {/* Progress Bar Background */}
      {doc.status !== 'ready' && doc.status !== 'error' && doc.status !== 'uploaded' && (
         <div 
           className="absolute bottom-0 left-0 h-1 bg-primary-500 transition-all duration-300 rounded-bl-xl" 
           style={{ width: `${doc.progress}%` }}
         ></div>
      )}

      <div className="flex items-center gap-4 w-full sm:w-auto flex-1 cursor-pointer" onClick={() => toggleSelectDoc(doc.id)}>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 font-bold text-xs uppercase">
            {doc.type}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className={`font-medium truncate ${selectedDocIds.includes(doc.id) ? 'text-primary-900 dark:text-primary-100' : 'text-slate-900 dark:text-white'}`}>{doc.name}</h4>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>{formatSize(doc.size)}</span>
              <span>•</span>
              <span>{new Date(doc.uploadedAt).toLocaleDateString()} {new Date(doc.uploadedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>
          </div>
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end mt-2 sm:mt-0">
          
          <div className="w-32 sm:w-40">
             <Select
               value={doc.chunkingStrategy}
               options={chunkingOptions}
               onChange={(val) => onUpdateStrategy(doc.id, val as ChunkingStrategy)}
               disabled={doc.status === 'processing' || doc.status === 'indexing'}
             />
          </div>

          <StatusBadge 
            status={mapStatusToBadgeType(doc.status)} 
            text={getStatusText(doc.status)} 
            icon={getStatusIcon(doc.status)}
            className="min-w-[100px]"
          />

          <div className="flex items-center gap-1">
              {(doc.status === 'uploaded' || doc.status === 'ready' || doc.status === 'error') && (
                <button
                  onClick={() => onStartProcessing(doc.id)}
                  className="p-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                  title={doc.status === 'uploaded' ? t.startParsing : t.reparse}
                >
                  <Icon name={doc.status === 'uploaded' ? "Play" : "RotateCw"} size={16} />
                </button>
              )}

              <button 
                onClick={() => onDeleteDoc(doc.id)}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={t.delete}
              >
                <Icon name="Trash2" size={16} />
              </button>
          </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full bg-slate-50 dark:bg-slate-950">
      
      {/* Sidebar - Knowledge Bases List */}
      <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-10">
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">{t.knowledgeBases}</h2>
          <button 
            onClick={openCreateModal}
            className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
            title={t.createNewBase}
          >
            <Icon name="Plus" size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {knowledgeBases.length === 0 && (
            <div className="text-center py-8 px-4 text-slate-400 text-xs">
               {t.noBases}
            </div>
          )}
          
          {knowledgeBases.map(base => {
             const docCount = documents.filter(d => d.knowledgeBaseId === base.id).length;
             return (
               <div key={base.id} className="relative group">
                 <button
                   onClick={() => setSelectedBaseId(base.id)}
                   className={`w-full text-left p-3 rounded-xl transition-all border ${
                     selectedBaseId === base.id 
                       ? 'bg-primary-50 dark:bg-slate-800 border-primary-200 dark:border-primary-900/30 shadow-sm' 
                       : 'bg-transparent border-transparent hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                   }`}
                 >
                   <div className="flex items-center justify-between mb-1">
                     <h3 className={`text-sm font-medium truncate ${selectedBaseId === base.id ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`}>
                       {base.name}
                     </h3>
                   </div>
                   <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                     <span>{docCount} docs</span>
                     <span>{new Date(base.updatedAt).toLocaleDateString()}</span>
                   </div>
                 </button>
                 
                 {/* Action Buttons (Edit & Delete) */}
                 <div className={`absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${selectedBaseId === base.id ? 'opacity-100' : ''}`}>
                   <button 
                      onClick={(e) => openEditModal(e, base)}
                      className="p-1 text-slate-400 hover:text-primary-500 rounded bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                      title="Edit"
                   >
                     <Icon name="Edit2" size={14} />
                   </button>
                   <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteBaseId(base.id);
                      }}
                      className="p-1 text-slate-400 hover:text-red-500 rounded bg-white/50 dark:bg-black/20 backdrop-blur-sm"
                      title="Delete"
                   >
                     <Icon name="Trash2" size={14} />
                   </button>
                 </div>
               </div>
             );
          })}
        </div>
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex justify-between">
             <span>{t.storageUsed}:</span>
             <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{formatSize(storageUsed)}</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
             <div className="bg-primary-500 h-full rounded-full" style={{ width: `${Math.min((storageUsed / (10*1024*1024)) * 100, 100)}%` }}></div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-900/50 relative">
         {selectedBase ? (
           <>
             <div className="p-6 md:p-8 border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg text-primary-600 dark:text-primary-400">
                     <Icon name="Database" size={20} />
                   </div>
                   <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedBase.name}</h1>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm pl-11 max-w-2xl">
                  {selectedBase.description || 'No description provided.'}
                </p>
             </div>

             <div className="flex-1 overflow-hidden flex flex-col p-6 md:p-8 relative z-0">
                {/* Upload Box */}
                <div 
                  className="mb-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center transition-all hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 group cursor-pointer bg-white/40 dark:bg-slate-900/40"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept=".pdf,.txt,.md" 
                    multiple 
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon name="UploadCloud" size={20} />
                    </div>
                    <div className="text-left">
                       <h3 className="text-sm font-medium text-slate-900 dark:text-white">{t.uploadDoc}</h3>
                       <p className="text-xs text-slate-500 dark:text-slate-400">{t.dragDrop} - {t.supportedTypes}</p>
                    </div>
                  </div>
                </div>

                {/* Toolbar: Select All, Sort, Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 px-1 gap-4">
                   <div className="flex items-center gap-4">
                     {/* Select All Button */}
                     <button 
                       onClick={toggleSelectAll}
                       disabled={filteredDocs.length === 0}
                       className="text-xs font-medium text-slate-500 hover:text-primary-600 flex items-center gap-2 transition-colors disabled:opacity-50"
                     >
                       <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                       }`}>
                          {selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0 && <Icon name="Check" size={10} />}
                       </div>
                       {selectedDocIds.length === filteredDocs.length && filteredDocs.length > 0 ? t.deselectAll : t.selectAll}
                     </button>

                     {/* Divider */}
                     <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block"></div>

                     {/* Sort Controls */}
                     <div className="flex items-center gap-2">
                        <Select 
                           value={sortField}
                           onChange={(val) => setSortField(val as SortField)}
                           options={[
                             { value: 'date', label: t.sortDate },
                             { value: 'name', label: t.sortName },
                             { value: 'size', label: t.sortSize },
                           ]}
                           className="w-24"
                           placeholder={t.sortBy}
                        />
                        <Tooltip content={sortOrder === 'asc' ? 'Ascending' : 'Descending'}>
                          <button 
                             onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                             className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-primary-600 transition-colors"
                          >
                             <Icon name={sortOrder === 'asc' ? "ArrowUpNarrowWide" : "ArrowDownNarrowWide"} size={16} />
                          </button>
                        </Tooltip>
                     </div>
                   </div>

                   {/* Search Bar */}
                   <div className="relative group max-w-xs w-full sm:w-48">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                       <Icon name="Search" size={14} className="text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                     </div>
                     <input
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder="Search docs..."
                       className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                     />
                   </div>
                </div>

                {/* Documents DataList */}
                <DataList<KnowledgeDocument>
                   data={paginatedDocs}
                   renderItem={renderDocItem}
                   keyExtractor={(doc) => doc.id}
                   emptyMessage={t.noDocs}
                   onClearSearch={() => setSearchQuery('')}
                   isSearching={!!searchQuery}
                />

                {/* Pagination Footer */}
                <Pagination 
                   currentPage={currentPage}
                   totalPages={totalPages}
                   totalItems={sortedDocs.length}
                   itemsPerPage={itemsPerPage}
                   onPageChange={setCurrentPage}
                   onNext={goToNextPage}
                   onPrev={goToPrevPage}
                   translations={{
                     showing: t.showing,
                     to: t.to,
                     of: t.of,
                     items: t.items,
                     page: t.page
                   }}
                />

                {/* Floating Batch Action Bar */}
                {selectedDocIds.length > 0 && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-2 flex items-center justify-between gap-4 animate-in slide-in-from-bottom-4 fade-in z-20">
                    <div className="flex items-center gap-3 pl-2">
                      <div className="bg-primary-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                         {selectedDocIds.length}
                      </div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{t.selected}</span>
                    </div>

                    <div className="flex items-center gap-2">
                       {/* Batch Strategy */}
                       <div className="w-40">
                          <Select 
                            value="" 
                            options={chunkingOptions} 
                            onChange={handleBatchStrategyChange} 
                            placeholder={t.batchStrategy}
                            className="w-full"
                          />
                       </div>

                       <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>

                       <button
                         onClick={handleBatchParse}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-lg text-xs font-medium transition-colors"
                       >
                         <Icon name="Play" size={14} />
                         {t.batchParse}
                       </button>

                       <button
                         onClick={handleBatchDelete}
                         className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-xs font-medium transition-colors"
                       >
                         <Icon name="Trash2" size={14} />
                         {t.batchDelete}
                       </button>

                       <button
                         onClick={() => setSelectedDocIds([])}
                         className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                       >
                         <Icon name="X" size={16} />
                       </button>
                    </div>
                  </div>
                )}
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
             <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
                <Icon name="Database" size={32} className="text-slate-300 dark:text-slate-600" />
             </div>
             <p>{t.selectBaseHint}</p>
           </div>
         )}
      </div>

      {/* Create/Edit Base Modal - moved to end to ensure proper stacking if simultaneous modals occur (rare) */}
      {isBaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 relative">
            <form onSubmit={handleBaseSubmit} className="p-6">
              <div className="flex items-center justify-between mb-6">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                   {editingBaseId ? 'Edit Knowledge Base' : t.createNewBase}
                 </h3>
                 <button type="button" onClick={() => setIsBaseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                   <Icon name="X" size={20} />
                 </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.baseName}</label>
                  <input 
                    type="text" 
                    value={baseFormName}
                    onChange={e => setBaseFormName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-slate-900 dark:text-white"
                    placeholder="e.g., Engineering Docs"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t.baseDesc}</label>
                  <textarea 
                    value={baseFormDesc}
                    onChange={e => setBaseFormDesc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-slate-900 dark:text-white resize-none h-24"
                    placeholder="Optional description..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button 
                  type="button"
                  onClick={() => setIsBaseModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={!baseFormName.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-lg shadow-primary-600/20 disabled:opacity-50"
                >
                  {editingBaseId ? t.save : t.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Last in DOM to be on top */}
      <ConfirmationModal 
        isOpen={!!deleteBaseId}
        title={t.deleteBaseTitle}
        message={t.deleteBaseMsg}
        onConfirm={() => {
          if (deleteBaseId) onDeleteBase(deleteBaseId);
          setDeleteBaseId(null);
        }}
        onCancel={() => setDeleteBaseId(null)}
      />
    </div>
  );
};
