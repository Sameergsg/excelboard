import { StrictMode, Component, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

class ErrorBoundary extends Component<{children: ReactNode}, {error: string | null}> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(err: Error) {
    return { error: err?.message ?? String(err) };
  }
  componentDidCatch(err: Error, info: {componentStack: string}) {
    console.error('[ExcelBoard Error]', err, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#0d1117', color: '#e6edf3', fontFamily: 'monospace', padding: 32
        }}>
          <div style={{ maxWidth: 640 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h1 style={{ color: '#f85149', marginBottom: 12, fontSize: 20 }}>Application Error</h1>
            <pre style={{
              background: '#161b22', padding: 16, borderRadius: 8, fontSize: 13,
              overflow: 'auto', border: '1px solid #30363d', color: '#d29922'
            }}>
              {this.state.error}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload(); }}
              style={{
                marginTop: 16, padding: '8px 20px', background: '#58a6ff', color: '#0d1117',
                border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600
              }}
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
