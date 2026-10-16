import React, { useEffect, useState } from 'react';
import type { BatchEmployeeDraft, EmployeeDocumentGroup } from '../types';
import { BatchDocumentUploader } from './BatchDocumentUploader';

interface DocumentUploaderProps {
  onBusyChange?: (busy: boolean) => void;
  batchEmployees?: BatchEmployeeDraft[];
  onBatchEmployeesChange?: (employees: BatchEmployeeDraft[]) => void;
  onCheckpoint?: (employees:BatchEmployeeDraft[],groups:EmployeeDocumentGroup[]) => Promise<void>;
  onProceedToStep2WithBatch: (employees: BatchEmployeeDraft[]) => void;
  employeeGroups: EmployeeDocumentGroup[];
  onEmployeeGroupsChange: (groups: EmployeeDocumentGroup[]) => void;
}

export function DocumentUploader({batchEmployees,onBatchEmployeesChange,onProceedToStep2WithBatch,employeeGroups,onEmployeeGroupsChange,onBusyChange,onCheckpoint}: DocumentUploaderProps) {
  const [busy,setBusy] = useState(false);
  useEffect(() => {
    if (!employeeGroups.length) onEmployeeGroupsChange([{id:crypto.randomUUID(),label:'',documents:[]}]);
  },[employeeGroups.length,onEmployeeGroupsChange]);
  return <div aria-busy={busy} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
    <BatchDocumentUploader groups={employeeGroups} employees={batchEmployees || []} onChange={onEmployeeGroupsChange} onProceed={onProceedToStep2WithBatch} onBusyChange={value => {setBusy(value);onBusyChange?.(value);}} onDraftsChange={onBatchEmployeesChange} onCheckpoint={onCheckpoint} />
  </div>;
}
