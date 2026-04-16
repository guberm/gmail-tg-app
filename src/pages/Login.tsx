import { useGoogleLogin } from '@react-oauth/google';
import { Mail, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const doLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      login(tokenResponse.access_token);
      navigate('/');
    },
    onError: () => {
      console.error('Login Failed');
      setLoading(false);
    },
    onNonOAuthError: () => setLoading(false),
    scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.readonly',
    ux_mode: 'redirect',
  });

  const handleLoginClick = () => {
    setLoading(true);
    doLogin();
  };

  return (
    <div className="flex-center" style={{ flex: 1, backgroundColor: 'var(--bg-primary)', padding: '20px' }}>
      <div 
        className="glass-panel animate-fade-in" 
        style={{ 
          maxWidth: '400px', 
          width: '100%', 
          padding: '40px 24px', 
          borderRadius: 'var(--radius-lg)',
          textAlign: 'center'
        }}
      >
        <div 
          className="flex-center" 
          style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '24px', 
            background: 'linear-gradient(135deg, var(--tg-blue) 0%, #1c64eb 100%)',
            margin: '0 auto 24px',
            boxShadow: '0 8px 16px rgba(51, 144, 236, 0.3)'
          }}
        >
          <Mail size={40} color="white" strokeWidth={1.5} />
        </div>
        
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>GMail for Telegram</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '15px' }}>
          Connect your Google account to read, send, and manage your emails seamlessly inside Telegram.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px', textAlign: 'left' }}>
          <FeatureItem icon={<Shield size={20} color="var(--tg-blue)" />} text="Secure OAuth 2.0 Login" />
          <FeatureItem icon={<Zap size={20} color="var(--accent-yellow)" />} text="Fast and Responsive native feel" />
        </div>

        <button 
          className="btn btn-primary" 
          style={{ width: '100%', padding: '14px', fontSize: '16px', borderRadius: 'var(--radius-lg)' }}
          onClick={handleLoginClick}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}

function FeatureItem({ icon, text }: { icon: React.JSX.Element, text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div className="flex-center" style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(51, 144, 236, 0.1)' }}>
        {icon}
      </div>
      <span style={{ fontSize: '14px', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
