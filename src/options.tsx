import { useRouter } from './options/router';
import LLMProviderPage from './options/pages/LLMProviderPage';
import ToolbarListPage from './options/pages/ToolbarListPage';
import ToolbarDetailPage from './options/pages/ToolbarDetailPage';
import icon48 from '../assets/icon48.png';

// Register routes
import { router } from './options/router';

// Route registration with parameter support
router.addRoute('/', ToolbarListPage);
router.addRoute('/provider', LLMProviderPage);
router.addRoute('/toolbars', ToolbarListPage);

// Handle dynamic routes for toolbar detail
router.addRoute('/toolbar/:id', (props: { params: Record<string, string> }) => (
  <ToolbarDetailPage toolbarId={props.params.id} />
));

function OptionsPage() {
  const { currentPath, navigate, getCurrentComponent } = useRouter();
  const CurrentComponent = getCurrentComponent();

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Navigation */}
      <nav style={{
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e2e8f0',
        padding: '0 20px',
        height: '60px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={icon48}
            alt="Agent Bar"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px'
            }}
          />
          <h1 style={{ margin: 0, fontSize: '20px', color: '#1e293b', fontWeight: '600' }}>
            Agent Bar
          </h1>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <button
            onClick={() => navigate('/toolbars')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: currentPath === '/' || currentPath.startsWith('/toolbar') ? '#dbeafe' : 'transparent',
              color: currentPath === '/' || currentPath.startsWith('/toolbar') ? '#1d4ed8' : '#64748b',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            📋 Toolbars
          </button>
          <button
            onClick={() => navigate('/provider')}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: currentPath === '/provider' ? '#dbeafe' : 'transparent',
              color: currentPath === '/provider' ? '#1d4ed8' : '#64748b',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
          >
            🤖 LLM Provider
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ minHeight: 'calc(100vh - 60px)' }}>
        {CurrentComponent ? <CurrentComponent /> : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '16px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h2>Page Not Found</h2>
            <p>The page you're looking for doesn't exist.</p>
            <button
              onClick={() => navigate('/')}
              style={{
                marginTop: '16px',
                padding: '8px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Go Home
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default OptionsPage;