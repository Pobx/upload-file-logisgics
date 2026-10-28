import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ingestApi } from '../api/ingestApi';
import {
  CSVImportResult,
  ConflictPolicy,
  ImportHistoryItem,
} from '../types/import';

export interface UseCSVImportOptions {
  defaultConflictPolicy?: ConflictPolicy | string;
  enableHistory?: boolean;
}

export const useCSVImport = (options?: UseCSVImportOptions) => {
  const queryClient = useQueryClient();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<CSVImportResult | null>(null);
  const [conflictPolicy, setConflictPolicy] = useState<string>(
    options?.defaultConflictPolicy || 'keep_existing'
  );
  const [committedBatchId, setCommittedBatchId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Upload Mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setSelectedFile(file);
      setUploadProgress(0);
      const res = await ingestApi.uploadCSV(file, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(pct);
          }
        },
      });
      return res;
    },
    onSuccess: (data) => {
      setSummary(data);
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
    },
  });

  // Commit Mutation
  const commitMutation = useMutation({
    mutationFn: async ({ batchId, policy }: { batchId: string; policy: string }) => {
      const res = await ingestApi.commitBatch({ batchId, policy });
      return res.batch_id || batchId;
    },
    onSuccess: (batchId) => {
      setCommittedBatchId(batchId);
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
    },
  });

  // History Query (optional)
  const historyQuery = useQuery<ImportHistoryItem[]>({
    queryKey: ['importHistory'],
    queryFn: () => ingestApi.getImportHistory(),
    enabled: options?.enableHistory ?? false,
  });

  const reset = useCallback(() => {
    setSelectedFile(null);
    setSummary(null);
    setCommittedBatchId(null);
    setUploadProgress(0);
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      uploadMutation.mutate(file);
    },
    [uploadMutation]
  );

  const handleCommit = useCallback(() => {
    if (!summary) return;
    commitMutation.mutate({
      batchId: summary.batch_id,
      policy: conflictPolicy,
    });
  }, [summary, conflictPolicy, commitMutation]);

  return {
    selectedFile,
    summary,
    setSummary,
    conflictPolicy,
    setConflictPolicy,
    committedBatchId,
    setCommittedBatchId,
    uploadProgress,
    uploadMutation,
    commitMutation,
    history: historyQuery.data || [],
    isHistoryLoading: historyQuery.isLoading,
    handleFileSelect,
    handleCommit,
    reset,
  };
};
