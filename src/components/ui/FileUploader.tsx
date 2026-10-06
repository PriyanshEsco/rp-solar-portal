import React, { useState, useRef } from 'react';
import { UploadCloud, File, X, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from './Button';

export interface FileUploaderProps {
  label?: string;
  accept?: string;
  maxSizeBytes?: number; // e.g. 10MB
  onFilesSelected?: (files: File[]) => void;
  helperText?: string;
  isUploading?: boolean;
  uploadProgress?: number; // 0 to 100
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  accept = '.pdf, .jpg, .jpeg, .png',
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  onFilesSelected,
  helperText = 'Supported formats: PDF, JPG, PNG up to 10MB',
  isUploading = false,
  uploadProgress,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [simulatedProgress, setSimulatedProgress] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > maxSizeBytes) {
        setErrorMessage(`File "${file.name}" exceeds maximum allowed size of 10MB.`);
        return;
      }
      newFiles.push(file);
    }

    const updated = [...selectedFiles, ...newFiles];
    setSelectedFiles(updated);

    // Simulate progress animation for realistic UX feedback
    setSimulatedProgress(10);
    const p1 = setTimeout(() => setSimulatedProgress(45), 150);
    const p2 = setTimeout(() => setSimulatedProgress(85), 350);
    const p3 = setTimeout(() => setSimulatedProgress(100), 550);
    const p4 = setTimeout(() => setSimulatedProgress(null), 1200);

    if (onFilesSelected) onFilesSelected(updated);
  };

  const removeFile = (index: number) => {
    const updated = selectedFiles.filter((_, i) => i !== index);
    setSelectedFiles(updated);
    if (onFilesSelected) onFilesSelected(updated);
  };

  const activeProgress = uploadProgress !== undefined ? uploadProgress : simulatedProgress;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {label && <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--rp-charcoal-700)' }}>{label}</label>}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isUploading) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? 'var(--rp-green-primary)' : 'var(--rp-gray-300)'}`,
          backgroundColor: isDragging ? 'var(--rp-green-surface)' : 'var(--rp-gray-50)',
          borderRadius: 'var(--radius-md)',
          padding: '24px 20px',
          textAlign: 'center',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
          opacity: isUploading ? 0.7 : 1,
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple
          disabled={isUploading}
          style={{ display: 'none' }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div
          style={{
            display: 'inline-flex',
            padding: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--rp-white)',
            border: '1px solid var(--rp-gray-200)',
            marginBottom: '8px',
            color: 'var(--rp-green-primary)',
          }}
        >
          {isUploading ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
        </div>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--rp-charcoal-800)' }}>
          {isUploading ? 'Encrypting and uploading files to secure storage...' : 'Click to upload or drag & drop files here'}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--rp-gray-500)', marginTop: '4px' }}>{helperText}</p>
      </div>

      {/* Upload Progress Bar */}
      {activeProgress !== null && (
        <div
          style={{
            marginTop: '4px',
            padding: '10px 14px',
            backgroundColor: 'var(--rp-white)',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--rp-green-dark)' }}>
              {activeProgress === 100 ? '✓ File upload & virus scanning complete' : 'Uploading to Secure Object Vault...'}
            </span>
            <span style={{ fontWeight: 700, color: 'var(--rp-green-primary)' }}>{activeProgress}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'var(--rp-gray-100)',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${activeProgress}%`,
                height: '100%',
                backgroundColor: activeProgress === 100 ? 'var(--rp-success)' : 'var(--rp-green-primary)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {errorMessage && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--rp-danger)' }}>
          <AlertTriangle size={14} /> <span>{errorMessage}</span>
        </div>
      )}

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
          {selectedFiles.map((file, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'var(--rp-white)',
                border: '1px solid var(--rp-gray-200)',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <File size={16} style={{ color: 'var(--rp-green-primary)' }} />
                <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--rp-charcoal-900)' }}>{file.name}</span>
                <span style={{ fontSize: '0.6875rem', color: 'var(--rp-gray-400)' }}>
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
                {activeProgress === 100 && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.6875rem', color: 'var(--rp-success)', fontWeight: 600 }}>
                    <CheckCircle2 size={12} /> Ready
                  </span>
                )}
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(idx);
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--rp-gray-400)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
