import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchFullEmail, trashEmail, fetchLabels, modifyMessageLabels } from '../api/gmail';
import type { EmailDetail, GmailLabel } from '../api/gmail';
import { ArrowLeft, Trash2, Reply, MoreVertical, Loader2, X, Tag, Star, Maximize2, Minimize2 } from 'lucide-react';

export default function EmailDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuth();
  const [email, setEmail] = useState<EmailDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [allLabels, setAllLabels] = useState<GmailLabel[]>([]);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [labelSearch, setLabelSearch] = useState('');
  const [isAutoFit, setIsAutoFit] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const labelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showLabelMenu) return;
    const handler = (e: MouseEvent) => {
      if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) {
        setShowLabelMenu(false);
        setLabelSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showLabelMenu]);

  useEffect(() => {
    if (!id || !accessToken) return;
    const loadEmail = async () => {
      setLoading(true);
      const [data, labelsData] = await Promise.all([
        fetchFullEmail(accessToken, id),
        fetchLabels(accessToken)
      ]);
      setEmail(data);
      setAllLabels(labelsData);
      setLoading(false);
    };
    loadEmail();
  }, [id, accessToken]);

  useEffect(() => {
    if (email?.htmlText && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        // Wrapping html content to respect dark mode as much as possible but avoiding breaking email styles
        doc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                  margin: 0;
                  padding: 16px;
                  color: #000;
                  background: #fff;
                  border-radius: 12px;
                  line-height: 1.5;
                  word-break: break-word;
                }
                a { color: #3390ec; }
                img { max-width: 100%; height: auto; }
                
                /* Dark mode media query for emails that support it */
                @media (prefers-color-scheme: dark) {
                  body {
                    background: #1e293b;
                    color: #f8fafc;
                  }
                }
              </style>
            </head>
            <body>${email.htmlText}</body>
          </html>
        `);
        doc.close();
        
        // Auto resize iframe height and intelligently scale width
        setTimeout(() => {
          if (iframeRef.current && iframeRef.current.contentWindow) {
            const iframeDoc = iframeRef.current.contentWindow.document;
            iframeDoc.documentElement.style.zoom = '1';
            
            // Intercept link clicks to open in external browser
            iframeDoc.addEventListener('click', (e) => {
              const target = e.target as HTMLElement;
              const anchor = target.closest('a');
              if (anchor && anchor.href) {
                e.preventDefault();
                const tg = (window as any).Telegram?.WebApp;
                if (tg && tg.openLink) {
                  tg.openLink(anchor.href);
                } else {
                  window.open(anchor.href, '_blank', 'noopener,noreferrer');
                }
              }
            });
            
            const iWidth = iframeRef.current.clientWidth;
            const cWidth = iframeDoc.body.scrollWidth;
            
            if (isAutoFit && cWidth > iWidth && iWidth > 0) {
              iframeDoc.documentElement.style.zoom = (iWidth / cWidth).toString();
            }
            
            setTimeout(() => {
              if (iframeRef.current && iframeRef.current.contentWindow) {
                iframeRef.current.style.height = `${iframeRef.current.contentWindow.document.documentElement.scrollHeight + 32}px`;
              }
            }, 50);
          }
        }, 500);
      }
    }
  }, [email, isAutoFit]);

  const handleToggleLabel = async (labelId: string, remove: boolean) => {
    if (!id || !accessToken || !email) return;
    const newLabels = remove 
      ? email.labels.filter(l => l !== labelId)
      : [...email.labels, labelId];
    
    setEmail({ ...email, labels: newLabels });

    try {
      await modifyMessageLabels(
        accessToken, 
        id, 
        remove ? [] : [labelId], 
        remove ? [labelId] : []
      );
    } catch (err) {
      setEmail(email);
    }
  };

  const handleDelete = async () => {
    if (!id || !accessToken) return;
    const tg = (window as any).Telegram?.WebApp;
    const execDelete = async () => {
      setIsDeleting(true);
      try {
        await trashEmail(accessToken, id);
        navigate('/');
      } catch (err) {
        if (tg?.showAlert) tg.showAlert('Failed to delete email');
        else alert('Failed to delete email');
      } finally {
        setIsDeleting(false);
      }
    };

    if (tg?.showConfirm) {
      tg.showConfirm('Delete this email?', (ok: boolean) => {
        if (ok) execDelete();
      });
    } else {
      if (window.confirm('Delete this email?')) execDelete();
    }
  };

  if (loading) {
    return (
      <div className="app-container flex-center">
        <Loader2 className="animate-spin" size={32} color="var(--tg-blue)" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="app-container flex-center">
        <p>Email not found.</p>
        <button className="btn btn-primary" style={{ marginTop: '16px' }} onClick={() => navigate('/')}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="glass-header flex-between" style={{ height: 'var(--header-height)', padding: '0 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <button className="btn-icon" onClick={() => navigate('/')}>
          <ArrowLeft size={24} />
        </button>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button 
            className="btn-icon" 
            onClick={() => handleToggleLabel('STARRED', email.labels.includes('STARRED'))}
          >
            <Star 
              size={20} 
              fill={email.labels.includes('STARRED') ? 'var(--accent-yellow)' : 'none'} 
              color={email.labels.includes('STARRED') ? 'var(--accent-yellow)' : 'currentColor'} 
            />
          </button>
          <button className="btn-icon" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? <Loader2 className="animate-spin" size={20} /> : <Trash2 size={20} />}
          </button>
          <button className="btn-icon">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <div className="content-area animate-fade-in" style={{ padding: '20px 16px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', lineHeight: 1.3 }}>
          {email.subject}
        </h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {email.labels.map(lId => {
            const label = allLabels.find(l => l.id === lId);
            if (!label) return null;
            // Hide common system labels that clutter UI unless edited
            if (label.name === 'UNREAD') return null;
            return (
              <span key={lId} style={{ background: 'var(--bg-tertiary)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {label.name}
                <X size={14} style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => handleToggleLabel(lId, true)} />
              </span>
            );
          })}
          <div ref={labelMenuRef} style={{ position: 'relative' }}>
            <span
              style={{ background: 'rgba(51, 144, 236, 0.1)', color: 'var(--tg-blue)', padding: '4px 8px', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }} 
              onClick={() => { setShowLabelMenu(!showLabelMenu); setLabelSearch(''); }}
            >
              <Tag size={12} /> Add Label
            </span>
            {showLabelMenu && (
              <div className="glass-panel" style={{ position: 'absolute', top: '100%', left: 0, marginTop: '8px', zIndex: 20, borderRadius: 'var(--radius-md)', minWidth: '180px', boxShadow: 'var(--shadow-lg)', overflow: 'hidden' }}>
                <div style={{ padding: '8px', borderBottom: '1px solid var(--glass-border)' }}>
                  <input
                    autoFocus
                    className="input"
                    placeholder="Search labels..."
                    value={labelSearch}
                    onChange={e => setLabelSearch(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ padding: '6px 10px', fontSize: '13px', borderRadius: 'var(--radius-sm)', height: '32px' }}
                  />
                </div>
                <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
                  {allLabels
                    .filter(l => !email.labels.includes(l.id) && l.type === 'user' && l.name.toLowerCase().includes(labelSearch.toLowerCase()))
                    .map(l => (
                      <div
                        key={l.id}
                        style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)' }}
                        onClick={() => { handleToggleLabel(l.id, false); setShowLabelMenu(false); setLabelSearch(''); }}
                      >
                        {l.name}
                      </div>
                    ))}
                  {allLabels
                    .filter(l => !email.labels.includes(l.id) && l.type === 'system' && l.name.toLowerCase().includes(labelSearch.toLowerCase()))
                    .map(l => (
                      <div
                        key={l.id}
                        style={{ padding: '10px 12px', fontSize: '13px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}
                        onClick={() => { handleToggleLabel(l.id, false); setShowLabelMenu(false); setLabelSearch(''); }}
                      >
                        {l.name}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex-between" style={{ marginBottom: '24px', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="flex-center" style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--tg-blue)', color: 'white', fontWeight: 600, fontSize: '18px' }}>
              {email.from.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 500, fontSize: '15px' }}>{email.from}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>to me</div>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            {new Date(email.date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="email-body-container" style={{ margin: '0 -16px', padding: '0 16px' }}>
          {email.htmlText ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ fontSize: '13px', padding: '6px 12px', display: 'flex', gap: '6px', alignItems: 'center', borderRadius: 'var(--radius-full)' }}
                  onClick={() => setIsAutoFit(!isAutoFit)}
                >
                  {isAutoFit ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                  {isAutoFit ? 'Original Size' : 'Fit to Screen'}
                </button>
              </div>
              <div style={{ width: '100%', overflowX: 'auto', borderRadius: '8px', background: '#fff' }}>
                <iframe 
                  ref={iframeRef}
                  title="email content"
                  style={{ width: '100%', border: 'none', minHeight: '300px', display: 'block' }}
                  sandbox="allow-same-origin allow-popups"
                />
              </div>
            </>
          ) : (
            <div className="email-body-content" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {email.plainText || email.snippet}
            </div>
          )}
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '12px 16px', display: 'flex', gap: '12px', position: 'sticky', bottom: 0, zIndex: 10 }}>
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
          onClick={() => navigate(`/compose?replyTo=${email.id}&to=${encodeURIComponent(email.from)}&subject=${encodeURIComponent('Re: ' + email.subject)}`)}
        >
          <Reply size={18} /> Reply
        </button>
        <button 
          className="btn btn-secondary" 
          style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
          onClick={() => navigate(`/compose?forward=${email.id}&subject=${encodeURIComponent('Fwd: ' + email.subject)}`)}
        >
          Forward
        </button>
      </div>
    </div>
  );
}
