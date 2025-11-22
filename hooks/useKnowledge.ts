
import { useState, useEffect } from 'react';
import { KnowledgeDocument, KnowledgeStatus, ChunkingStrategy, KnowledgeBaseItem } from '../types';

const DOCS_STORAGE_KEY = 'agno_knowledge_docs';
const BASES_STORAGE_KEY = 'agno_knowledge_bases';

/**
 * Hook to manage the Knowledge Base (Collections) and Documents.
 * Supports creating multiple bases and managing documents within them.
 * Updated to support batch operations.
 */
export const useKnowledge = () => {
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBaseItem[]>([]);
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);
  
  // Load from local storage
  useEffect(() => {
    const savedDocs = localStorage.getItem(DOCS_STORAGE_KEY);
    const savedBases = localStorage.getItem(BASES_STORAGE_KEY);
    
    if (savedBases) {
      try {
        setKnowledgeBases(JSON.parse(savedBases));
      } catch (e) {
        console.error("Failed to load knowledge bases");
      }
    } else {
      // Initial Default Base
      const defaultBase: KnowledgeBaseItem = {
        id: 'default-1',
        name: 'General Knowledge',
        description: 'Default knowledge base for general documents.',
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      setKnowledgeBases([defaultBase]);
      localStorage.setItem(BASES_STORAGE_KEY, JSON.stringify([defaultBase]));
    }

    if (savedDocs) {
      try {
        setDocuments(JSON.parse(savedDocs));
      } catch (e) {
        console.error("Failed to load documents");
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  useEffect(() => {
    localStorage.setItem(BASES_STORAGE_KEY, JSON.stringify(knowledgeBases));
  }, [knowledgeBases]);

  // --- Knowledge Base Management ---

  const createKnowledgeBase = (name: string, description: string) => {
    const newBase: KnowledgeBaseItem = {
      id: Date.now().toString(),
      name,
      description,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    setKnowledgeBases(prev => [newBase, ...prev]);
    return newBase.id;
  };

  const updateKnowledgeBase = (id: string, name: string, description: string) => {
    setKnowledgeBases(prev => prev.map(base => 
      base.id === id 
        ? { ...base, name, description, updatedAt: Date.now() }
        : base
    ));
  };

  const deleteKnowledgeBase = (id: string) => {
    // Remove base
    setKnowledgeBases(prev => prev.filter(b => b.id !== id));
    // Remove all docs associated with this base
    setDocuments(prev => prev.filter(d => d.knowledgeBaseId !== id));
  };

  // --- Document Management ---

  /**
   * Simulates the progress of document processing.
   * @param id Document ID
   */
  const simulateProcessing = (id: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 10; // Random increment
      
      setDocuments(prev => prev.map(doc => {
        if (doc.id !== id) return doc;

        let status: KnowledgeStatus = doc.status;
        
        // Simulate RAG stages based on progress
        if (progress < 70) status = 'processing'; // Text Extraction & Chunking
        else if (progress < 95) status = 'indexing';   // Vector Embedding
        else if (progress >= 100) {
           progress = 100;
           status = 'ready';
           clearInterval(interval);
        }

        return { ...doc, progress: Math.min(progress, 100), status };
      }));

      if (progress >= 100) clearInterval(interval);
    }, 200); // Fast update
  };

  const uploadDocument = (knowledgeBaseId: string, file: File) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newDoc: KnowledgeDocument = {
      id,
      knowledgeBaseId,
      name: file.name,
      type: file.name.split('.').pop()?.toLowerCase() as any || 'txt',
      size: file.size,
      status: 'uploaded', // Initial state: Uploaded but not processed
      progress: 0,
      uploadedAt: Date.now(),
      chunkingStrategy: 'fixed' // Default strategy
    };

    setDocuments(prev => [newDoc, ...prev]);
    
    // Update base timestamp
    setKnowledgeBases(prev => prev.map(b => 
        b.id === knowledgeBaseId ? { ...b, updatedAt: Date.now() } : b
    ));
  };

  const updateDocumentStrategy = (id: string, strategy: ChunkingStrategy) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, chunkingStrategy: strategy } : doc
    ));
  };

  const startProcessing = (id: string) => {
    // Reset progress and set status to processing
    setDocuments(prev => prev.map(doc => 
      doc.id === id ? { ...doc, status: 'processing', progress: 0 } : doc
    ));
    simulateProcessing(id);
  };

  const deleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  // --- Batch Operations ---

  const batchDeleteDocuments = (ids: string[]) => {
    setDocuments(prev => prev.filter(d => !ids.includes(d.id)));
  };

  const batchUpdateStrategy = (ids: string[], strategy: ChunkingStrategy) => {
    setDocuments(prev => prev.map(doc => 
      ids.includes(doc.id) ? { ...doc, chunkingStrategy: strategy } : doc
    ));
  };

  const batchStartProcessing = (ids: string[]) => {
    setDocuments(prev => prev.map(doc => 
      ids.includes(doc.id) ? { ...doc, status: 'processing', progress: 0 } : doc
    ));
    ids.forEach(id => simulateProcessing(id));
  };

  const getStorageUsage = () => {
    return documents.reduce((acc, doc) => acc + doc.size, 0);
  };

  const getDocumentsByBase = (baseId: string) => {
    return documents.filter(d => d.knowledgeBaseId === baseId);
  };

  return {
    knowledgeBases,
    createKnowledgeBase,
    updateKnowledgeBase,
    deleteKnowledgeBase,
    documents,
    uploadDocument,
    deleteDocument,
    getStorageUsage,
    updateDocumentStrategy,
    startProcessing,
    getDocumentsByBase,
    // Batch exports
    batchDeleteDocuments,
    batchUpdateStrategy,
    batchStartProcessing
  };
};
