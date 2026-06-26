import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Link, Cloud, Database, BarChart2, HardDrive } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { sourcesApi } from '../../lib/api';
import { useAppStore } from '../../stores/useAppStore';
import type { DataSource } from '../../types';
import { Spinner } from '../ui/Spinner';

type SourceType = 'local' | 'url' | 'onedrive' | 'azure' | 'looker';

interface Props { open: boolean; onClose: () => void; }

const SOURCE_TYPES = [
  { id: 'local' as SourceType, label: 'Local File', icon: HardDrive, desc: 'Upload .xlsx from your PC' },
  { id: 'url' as SourceType, label: 'Direct URL', icon: Link, desc: 'Link to a public/private Excel URL' },
  { id: 'onedrive' as SourceType, label: 'OneDrive', icon: Cloud, desc: 'Microsoft OneDrive / SharePoint' },
  { id: 'azure' as SourceType, label: 'Azure Blob', icon: Database, desc: 'Azure Blob Storage' },
  { id: 'looker' as SourceType, label: 'Looker', icon: BarChart2, desc: 'Looker Look or Explore' },
];

export function AddSourceModal({ open, onClose }: Props) {
  const [step, setStep] = useState<'type' | 'config'>('type');
  const [sourceType, setSourceType] = useState<SourceType>('local');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addSource, setActiveSourceId, setActiveTab } = useAppStore();

  // Local
  const [file, setFile] = useState<File | null>(null);
  const onDrop = useCallback((files: File[]) => setFile(files[0] || null), []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] }, multiple: false });

  // URL
  const [url, setUrl] = useState('');

  // Azure
  const [azureConn, setAzureConn] = useState('');
  const [azureContainer, setAzureContainer] = useState('');
  const [azureBlob, setAzureBlob] = useState('');
  const [azureContainers, setAzureContainers] = useState<string[]>([]);
  const [azureBlobs, setAzureBlobs] = useState<{ name: string; size: number }[]>([]);

  // Looker
  const [lookerUrl, setLookerUrl] = useState('');
  const [lookerClientId, setLookerClientId] = useState('');
  const [lookerClientSecret, setLookerClientSecret] = useState('');
  const [lookerLooks, setLookerLooks] = useState<{ id: number; title: string }[]>([]);
  const [lookerLookId, setLookerLookId] = useState<number | null>(null);

  function reset() {
    setStep('type'); setError(''); setFile(null); setUrl('');
    setAzureConn(''); setAzureContainer(''); setAzureBlob('');
    setAzureContainers([]); setAzureBlobs([]);
    setLookerUrl(''); setLookerClientId(''); setLookerClientSecret('');
    setLookerLooks([]); setLookerLookId(null);
  }

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      let data: DataSource;
      if (sourceType === 'local') {
        if (!file) throw new Error('Please select a file');
        data = await sourcesApi.upload(file);
      } else if (sourceType === 'url') {
        if (!url) throw new Error('Please enter a URL');
        data = await sourcesApi.importUrl(url);
      } else if (sourceType === 'azure') {
        data = await sourcesApi.importAzure({ connectionString: azureConn, container: azureContainer, blobName: azureBlob });
      } else if (sourceType === 'looker') {
        if (!lookerLookId) throw new Error('Please select a Look');
        data = await sourcesApi.importLooker({ baseUrl: lookerUrl, clientId: lookerClientId, clientSecret: lookerClientSecret, lookId: lookerLookId });
      } else {
        throw new Error('OneDrive: use the OAuth button to connect');
      }
      data.sheet_names = ((data as unknown as Record<string, unknown>).sheetNames as string[]) || data.sheet_names || [];
      addSource(data);
      setActiveSourceId(data.id);
      setActiveTab('dashboard');
      onClose(); reset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }

  async function testAzure() {
    setLoading(true);
    try {
      const r = await sourcesApi.testAzure(azureConn);
      setAzureContainers(r.containers);
    } catch (e: unknown) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function loadAzureBlobs() {
    setLoading(true);
    try {
      const r = await sourcesApi.listAzureBlobs(azureConn, azureContainer);
      setAzureBlobs(r.blobs);
    } catch (e: unknown) { setError(String(e)); }
    finally { setLoading(false); }
  }

  async function testLooker() {
    setLoading(true);
    try {
      const looks = await sourcesApi.listLookerLooks({ baseUrl: lookerUrl, clientId: lookerClientId, clientSecret: lookerClientSecret });
      setLookerLooks(looks);
    } catch (e: unknown) { setError(String(e)); }
    finally { setLoading(false); }
  }

  return (
    <Modal open={open} onClose={() => { onClose(); reset(); }} title="Add Data Source" size="lg">
      {step === 'type' && (
        <div>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">Choose where your Excel data lives:</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SOURCE_TYPES.map(st => (
              <button
                key={st.id}
                onClick={() => { setSourceType(st.id); setStep('config'); }}
                className="flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all hover:border-[var(--color-accent)] hover:bg-[var(--color-bg-secondary)] border-[var(--color-border)]"
              >
                <st.icon size={22} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <div className="font-medium text-sm text-[var(--color-text)]">{st.label}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">{st.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'config' && (
        <div className="space-y-4">
          <button onClick={() => setStep('type')} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">← Back</button>

          {sourceType === 'local' && (
            <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5' : 'border-[var(--color-border)] hover:border-[var(--color-accent)]'}`}>
              <input {...getInputProps()} />
              <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--color-accent)' }} />
              {file ? <p className="font-medium text-[var(--color-text)]">{file.name}</p> : <p className="text-[var(--color-text-secondary)]">Drop your Excel file here or <span style={{ color: 'var(--color-accent)' }}>browse</span></p>}
              <p className="text-xs text-[var(--color-text-muted)] mt-1">.xlsx, .xls, .xlsm — up to 50MB</p>
            </div>
          )}

          {sourceType === 'url' && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1">Excel File URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/data.xlsx" className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
            </div>
          )}

          {sourceType === 'onedrive' && (
            <div className="text-center py-6">
              <Cloud size={40} className="mx-auto mb-3" style={{ color: 'var(--color-accent)' }} />
              <p className="text-[var(--color-text-secondary)] mb-4">Connect your Microsoft account to browse OneDrive files.</p>
              <Button onClick={async () => {
                const { authUrl } = await sourcesApi.getOneDriveAuthUrl();
                window.open(authUrl, '_blank', 'width=600,height=700');
              }}>Connect Microsoft Account</Button>
              <p className="text-xs text-[var(--color-text-muted)] mt-3">Requires MICROSOFT_CLIENT_ID in backend .env</p>
            </div>
          )}

          {sourceType === 'azure' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Connection String / SAS URL</label>
                <input value={azureConn} onChange={e => setAzureConn(e.target.value)} placeholder="DefaultEndpointsProtocol=https;AccountName=..." className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
              </div>
              <Button variant="secondary" size="sm" onClick={testAzure} disabled={!azureConn || loading}>Test Connection</Button>
              {azureContainers.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Container</label>
                  <select value={azureContainer} onChange={e => { setAzureContainer(e.target.value); setAzureBlobs([]); }} className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)]">
                    <option value="">Select container...</option>
                    {azureContainers.map(c => <option key={c}>{c}</option>)}
                  </select>
                  {azureContainer && <Button variant="secondary" size="sm" className="mt-2" onClick={loadAzureBlobs}>Load Files</Button>}
                </div>
              )}
              {azureBlobs.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Excel File</label>
                  <select value={azureBlob} onChange={e => setAzureBlob(e.target.value)} className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)]">
                    <option value="">Select file...</option>
                    {azureBlobs.map(b => <option key={b.name}>{b.name}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {sourceType === 'looker' && (
            <div className="space-y-3">
              {[
                { label: 'Looker Instance URL', val: lookerUrl, set: setLookerUrl, ph: 'https://yourcompany.looker.com' },
                { label: 'Client ID', val: lookerClientId, set: setLookerClientId, ph: 'Client ID' },
                { label: 'Client Secret', val: lookerClientSecret, set: setLookerClientSecret, ph: 'Client Secret', type: 'password' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">{f.label}</label>
                  <input type={f.type || 'text'} value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)] outline-none focus:border-[var(--color-accent)]" />
                </div>
              ))}
              <Button variant="secondary" size="sm" onClick={testLooker} disabled={!lookerUrl || !lookerClientId || !lookerClientSecret || loading}>Load Looks</Button>
              {lookerLooks.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1">Select Look</label>
                  <select value={lookerLookId ?? ''} onChange={e => setLookerLookId(Number(e.target.value))} className="w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text)]">
                    <option value="">Select a Look...</option>
                    {lookerLooks.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                  </select>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-[var(--color-error)] bg-[var(--color-error)]/10 rounded-lg p-3">{error}</p>}

          {sourceType !== 'onedrive' && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => { onClose(); reset(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? <Spinner size={16} /> : null} Import
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
