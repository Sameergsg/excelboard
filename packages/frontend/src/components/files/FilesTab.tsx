import { useRef } from 'react';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { useAppStore } from '../../stores/useAppStore';
import { Button } from '../ui/Button';
import { FileCard } from './FileCard';
import { UploadZone } from './UploadZone';

export function FilesTab() {
  const { sources } = useAppStore();
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const triggerUpload = () => {
    const el = document.getElementById('upload-dropzone');
    if (el) el.click();
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
            My Data Sources
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {sources.length} {sources.length === 1 ? 'file' : 'files'} connected
          </p>
        </div>
        <Button variant="primary" onClick={triggerUpload}>
          <Upload size={15} />
          Upload Files
        </Button>
      </div>

      {/* Empty state */}
      {sources.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'color-mix(in srgb, var(--color-accent) 12%, transparent)' }}
          >
            <FileSpreadsheet size={32} style={{ color: 'var(--color-accent)' }} />
          </div>
          <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            No files yet
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Upload your Excel files to start building dashboards
          </p>
          <Button variant="primary" onClick={triggerUpload}>
            <Upload size={15} />
            Upload your first file
          </Button>
        </div>
      )}

      {/* File grid */}
      {sources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sources.map(s => (
            <FileCard key={s.id} source={s} />
          ))}
        </div>
      )}

      {/* Upload zone */}
      <div ref={dropzoneRef}>
        <UploadZone />
      </div>
    </div>
  );
}
