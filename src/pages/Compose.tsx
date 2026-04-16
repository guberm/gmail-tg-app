import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { sendEmail } from '../api/gmail';
import { Send, X } from 'lucide-react';

export default function Compose() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { accessToken } = useAuth();
  
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const toParam = searchParams.get('to');
    const subjectParam = searchParams.get('subject');
    
    if (toParam) {
      const match = toParam.match(/<([^>]+)>/);
      setTo(match ? match[1] : toParam);
    }
    if (subjectParam) setSubject(subjectParam);
  }, [searchParams]);

  const handleSend = async () => {
    if (!to || !subject || !body || !accessToken) {
      alert('Please fill out all fields.');
      return;
    }

    setIsSending(true);
    try {
      await sendEmail(accessToken, to, subject, body);
      alert('Email sent successfully!');
      navigate('/');
    } catch (err) {
      alert('Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
      <header className="glass-header flex-between" style={{ height: 'var(--header-height)', padding: '0 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button className="btn-icon" onClick={() => navigate(-1)}>
            <X size={24} />
          </button>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>Compose</h1>
        </div>
        <button 
          className="btn btn-primary" 
          style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
          onClick={handleSend}
          disabled={isSending || !to || !body}
        >
          {isSending ? 'Sending...' : <><Send size={16} /> Send</>}
        </button>
      </header>

      <div className="content-area animate-fade-in" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <input 
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="To" 
            autoCapitalize="none"
            autoComplete="email"
            style={{ 
              width: '100%', 
              padding: '16px 0', 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)',
              fontSize: '15px',
              outline: 'none'
            }} 
          />
        </div>
        <div style={{ padding: '0 16px', borderBottom: '1px solid var(--glass-border)' }}>
          <input 
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder="Subject" 
            style={{ 
              width: '100%', 
              padding: '16px 0', 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--text-primary)',
              fontSize: '15px',
              outline: 'none',
              fontWeight: 500
            }} 
          />
        </div>
        <textarea 
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Compose email" 
          style={{ 
            flex: 1, 
            width: '100%', 
            padding: '16px', 
            background: 'transparent', 
            border: 'none', 
            color: 'var(--text-primary)',
            fontSize: '15px',
            resize: 'none',
            outline: 'none',
            lineHeight: 1.5
          }} 
        />
      </div>
    </div>
  );
}
