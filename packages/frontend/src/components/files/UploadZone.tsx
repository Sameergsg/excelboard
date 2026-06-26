import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { sourcesApi } from '../../lib/api';
import { useAppStore } from '../../stores/useAppStore';
import { cn } from '../../lib/utils';
import type { DataSource } from '../../types';

interface FileStatus {
  file: File;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadZone() {
  const { addSource } = useAppStore();
  const [fileStatuses, setFileStatuses] = useState<FileStatus[]>([]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const newStatuses: FileStatus[] = accepted.map(f => ({
        file: f,
        progress: 0,
        status: 'uploading',
      }));
      setFileStatuses(prev => [...prev, ...newStatuses]);

      for (const file of accepted) {
        setFileStatuses(prev =>
          prev.map(s =>
            s.file === file ? { ...s, progress: 30 } : s
          )
        );
        try {
          setFileStatuses(prev =>
            prev.map(s => (s.file === file ? { ...s, progress: 60 } : s))
          );
          const result = await sourcesApi.upload(file);
          const source: DataSource = {
            ...result,
            sheet_names: Array.isArray(result.sheet_names)
              ? result.sheet_names
              : JSON.parse(result.sheet_names || '[]'),
          };
          addSource(source);
          setFileStatuses(prev =>
            prev.map(s =>
              s.file === file ? { ...s, progress: 100, status: 'success' } : s
            )
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed';
          setFileStatuses(prev =>
            prev.map(s =>
              s.file === file ? { ...s, status: 'error', error: msg } : s
            )
          );
        }
      }

      // Auto-clear successes after 3s
      setTimeout(() => {
        setFileStatuses(prev => prev.filter(s => s.status !== 'success'));
      }, 3000);
    },
    [addSource]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    noClick: false,
  });

  // Expose open function via ref pattern — attach to data attribute so FilesTab can call it
  return (
    <div>
      <div
        {...getRootProps()}
        data-dropzone-open={String(open)}
        id="upload-dropzone"
        className={cn(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_8%,transparent)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)]'
        )}
      >
        <input {...getInputProps()} />
        <Upload
          size={32}
          className="mx-auto mb-3"
          style={{ color: isDragActive ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
        />
        {isDragActive ? (
          <p className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>
            Drop your Excel files here…
          </p>
        ) : (
          <>
            <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
              Drag & drop Excel files here
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              or click to browse — .xlsx, .xls supported
            </p>
          </>
        )}
      </div>

      {fileStatuses.length > 0 && (
        <div className="mt-3 space-y-2">
          {fileStatuses.map((fs, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg border"
              style={{
                background: 'var(--color-card)',
                borderColor: 'var(--color-border)',
              }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
                  {fs.file.name}
                </p>
                {fs.status === 'uploading' && (
                  <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-border)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${fs.progress}%`,
                        background: 'var(--color-accent)',
                      }}
                    />
                  </div>
                )}
                {fs.status === 'error' && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-error)' }}>
                    {fs.error}
                  </p>
                )}
              </div>
              {fs.status === 'success' && (
                <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
              )}
              {fs.status === 'error' && (
                <AlertCircle size={16} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
              )}
              {fs.status === 'uploading' && (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {fs.progress}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Export open trigger helper
export function triggerDropzoneOpen() {
  const el = document.getElementById('upload-dropzone');
  if (el) (el as HTMLElement).click();
}
