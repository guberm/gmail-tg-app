import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmails, fetchLatestMessageId, getUnreadCount, modifyMessageLabels, trashEmail } from '../api/gmail';
import type { EmailMessage } from '../api/gmail';
import { useNavigate } from 'react-router-dom';
import { Search, Edit3, LogOut, Inbox, Send, FileText, Star, RefreshCw, Trash2, MailOpen, Mail } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function Home() {
  const { accessToken, logout } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState('INBOX');
  const [search, setSearch] = useState('');
  const [queryTimeout, setQueryTimeout] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ email: EmailMessage; x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const latestIdRef = useRef<string | null>(null);
  const POLL_INTERVAL = 30_000;

  const loadEmails = useCallback(async (searchQuery = '', silent = false) => {
    if (!accessToken) return;
    if (!silent) setLoading(true);
    const msgs = await fetchEmails(accessToken, folder, 20, searchQuery);
    setEmails(msgs);
    if (msgs.length > 0) latestIdRef.current = msgs[0].id;
    if (!silent) setLoading(false);
  }, [accessToken, folder]);

  const loadUnread = useCallback(async () => {
    if (!accessToken) return;
    const count = await getUnreadCount(accessToken);
    setUnreadCount(count);
  }, [accessToken]);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await Promise.all([loadEmails(search), loadUnread()]);
    setRefreshing(false);
  };

  useEffect(() => {
    loadEmails(search);
    loadUnread();
  }, [folder, accessToken]);

  // Background poll: cheaply check latest ID, full refresh only if changed
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(async () => {
      const latestId = await fetchLatestMessageId(accessToken, folder, search);
      if (latestId && latestId !== latestIdRef.current) {
        await Promise.all([loadEmails(search, true), loadUnread()]);
      } else {
        await loadUnread();
      }
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [accessToken, folder, search, loadEmails, loadUnread]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (queryTimeout) clearTimeout(queryTimeout);
    setQueryTimeout(setTimeout(() => {
      loadEmails(val);
    }, 600));
  };

  const formatEmailDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return dateStr.split(' ')[0] || '';
    }
  };

  const handleToggleStar = async (e: React.MouseEvent, emailId: string, currentStarred: boolean) => {
    e.stopPropagation();
    if (!accessToken) return;

    // Optimistic UI update
    setEmails(currentEmails => currentEmails.map(email => 
      email.id === emailId ? { ...email, starred: !currentStarred } : email
    ));

    try {
      await modifyMessageLabels(
        accessToken,
        emailId,
        !currentStarred ? ['STARRED'] : [],
        currentStarred ? ['STARRED'] : []
      );
    } catch (err) {
      setEmails(currentEmails => currentEmails.map(email =>
        email.id === emailId ? { ...email, starred: currentStarred } : email
      ));
    }
  };

  const startLongPress = (e: React.TouchEvent | React.MouseEvent, email: EmailMessage) => {
    longPressTriggered.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setContextMenu({ email, x: clientX, y: clientY });
    }, 500);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  };

  const handleEmailClick = (emailId: string) => {
    if (longPressTriggered.current) { longPressTriggered.current = false; return; }
    navigate(`/email/${emailId}`);
  };

  const handleContextMarkReadToggle = async (email: EmailMessage) => {
    if (!accessToken) return;
    setContextMenu(null);
    setEmails(curr => curr.map(e => e.id === email.id ? { ...e, unread: !email.unread } : e));
    try {
      await modifyMessageLabels(accessToken, email.id, email.unread ? [] : ['UNREAD'], email.unread ? ['UNREAD'] : []);
    } catch {
      setEmails(curr => curr.map(e => e.id === email.id ? { ...e, unread: email.unread } : e));
    }
  };

  const handleContextStarToggle = async (email: EmailMessage) => {
    if (!accessToken) return;
    setContextMenu(null);
    setEmails(curr => curr.map(e => e.id === email.id ? { ...e, starred: !email.starred } : e));
    try {
      await modifyMessageLabels(accessToken, email.id, email.starred ? [] : ['STARRED'], email.starred ? ['STARRED'] : []);
    } catch {
      setEmails(curr => curr.map(e => e.id === email.id ? { ...e, starred: email.starred } : e));
    }
  };

  const handleContextDelete = async (email: EmailMessage) => {
    if (!accessToken) return;
    setContextMenu(null);
    setEmails(curr => curr.filter(e => e.id !== email.id));
    try {
      await trashEmail(accessToken, email.id);
    } catch {
      setEmails(curr => [email, ...curr]);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="glass-header flex-between" style={{ height: 'var(--header-height)', padding: '0 16px', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="flex-center" style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--tg-blue)' }}>
            <MailIcon color="white" />
          </div>
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>Inbox</h1>
          {unreadCount > 0 && <span className="badge badge-red">{unreadCount}</span>}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn-icon" onClick={handleRefresh} title="Refresh" disabled={refreshing}>
            <RefreshCw size={20} className={refreshing ? 'spin' : ''} style={{ opacity: refreshing ? 0.5 : 1 }} />
          </button>
          <button className="btn-icon" onClick={logout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Search */}
      <div style={{ padding: '12px 16px', background: 'var(--bg-primary)' }}>
        <div className="input-group">
          <Search size={18} style={{ position: 'absolute', left: '16px', top: '15px', color: 'var(--text-secondary)' }} />
          <input 
            className="input" 
            placeholder="Search emails..." 
            value={search}
            onChange={handleSearchChange}
            style={{ paddingLeft: '44px', borderRadius: 'var(--radius-lg)' }}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 16px 12px', gap: '8px', overflowX: 'auto' }}>
        <TabButton active={folder === 'INBOX'} onClick={() => setFolder('INBOX')} icon={<Inbox size={16} />} text="Inbox" />
        <TabButton active={folder === 'SENT'} onClick={() => setFolder('SENT')} icon={<Send size={16} />} text="Sent" />
        <TabButton active={folder === 'DRAFT'} onClick={() => setFolder('DRAFT')} icon={<FileText size={16} />} text="Drafts" />
      </div>

      {/* Email List */}
      <div className="content-area" style={{ padding: '0 8px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px' }}>
             {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton" style={{ height: '80px', width: '100%', borderRadius: 'var(--radius-md)' }} />
             ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex-center" style={{ height: '200px', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)' }}>
            <Inbox size={48} opacity={0.5} />
            <p style={{ margin: 0 }}>{search ? 'No results' : 'No messages found'}</p>
            {!search && (
              <button className="btn btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={handleRefresh}>
                Retry
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {emails.map((email) => (
              <div
                key={email.id}
                className="animate-fade-in"
                onClick={() => handleEmailClick(email.id)}
                onTouchStart={(e) => startLongPress(e, email)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                onMouseDown={(e) => { if (e.button === 0) startLongPress(e, email); }}
                onMouseUp={cancelLongPress}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ email, x: e.clientX, y: e.clientY }); }}
                style={{
                  display: 'flex',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 0.2s',
                  background: email.unread ? 'rgba(51, 144, 236, 0.05)' : 'transparent',
                  borderLeft: email.unread ? '3px solid var(--tg-blue)' : '3px solid transparent',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                onMouseOver={(e) => Object.assign(e.currentTarget.style, { background: 'var(--bg-secondary)' })}
                onMouseOut={(e) => Object.assign(e.currentTarget.style, { background: email.unread ? 'rgba(51, 144, 236, 0.05)' : 'transparent' })}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex-between" style={{ marginBottom: '4px' }}>
                    <span 
                      className="text-ellipsis" 
                      style={{ 
                        fontWeight: email.unread ? 600 : 500, 
                        color: email.unread ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '15px' 
                      }}
                    >
                      {email.from}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, marginLeft: '8px' }}>
                      <button 
                        className="btn-icon" 
                        style={{ padding: '4px', margin: '-4px' }} 
                        onClick={(e) => handleToggleStar(e, email.id, email.starred)}
                      >
                        <Star 
                          size={16} 
                          fill={email.starred ? 'var(--accent-yellow)' : 'none'} 
                          color={email.starred ? 'var(--accent-yellow)' : 'var(--text-secondary)'} 
                          style={{ opacity: email.starred ? 1 : 0.4 }}
                        />
                      </button>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {formatEmailDate(email.date)}
                      </span>
                    </div>
                  </div>
                  <div className="text-ellipsis" style={{ fontWeight: email.unread ? 500 : 400, fontSize: '14px', marginBottom: '2px' }}>
                    {email.subject}
                  </div>
                  <div className="text-ellipsis" style={{ fontSize: '13px', color: 'var(--text-secondary)', opacity: 0.8 }}>
                    {email.snippet}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        className="btn-primary flex-center"
        onClick={() => navigate('/compose')}
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <Edit3 size={24} color="white" />
      </button>

      {/* Long-press context menu */}
      {contextMenu && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setContextMenu(null)}
          onTouchStart={() => setContextMenu(null)}
        >
          <div
            className="glass-panel"
            onClick={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: Math.min(contextMenu.y, window.innerHeight - 180),
              left: Math.min(contextMenu.x, window.innerWidth - 200),
              zIndex: 51,
              minWidth: '190px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              overflow: 'hidden',
            }}
          >
            {[
              {
                icon: contextMenu.email.unread ? <MailOpen size={16} /> : <Mail size={16} />,
                label: contextMenu.email.unread ? 'Mark as read' : 'Mark as unread',
                action: () => handleContextMarkReadToggle(contextMenu.email),
              },
              {
                icon: <Star size={16} fill={contextMenu.email.starred ? 'var(--accent-yellow)' : 'none'} color={contextMenu.email.starred ? 'var(--accent-yellow)' : 'currentColor'} />,
                label: contextMenu.email.starred ? 'Unstar' : 'Star',
                action: () => handleContextStarToggle(contextMenu.email),
              },
              {
                icon: <Trash2 size={16} color="var(--accent-red, #ef4444)" />,
                label: 'Delete',
                action: () => handleContextDelete(contextMenu.email),
                danger: true,
              },
            ].map(({ icon, label, action, danger }) => (
              <div
                key={label}
                onClick={action}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', fontSize: '14px', cursor: 'pointer',
                  borderBottom: '1px solid var(--glass-border)',
                  color: danger ? 'var(--accent-red, #ef4444)' : 'var(--text-primary)',
                }}
              >
                {icon} {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, text }: { active: boolean, onClick: () => void, icon: React.JSX.Element, text: string }) {
  return (
    <button 
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 16px',
        borderRadius: 'var(--radius-full)',
        border: 'none',
        background: active ? 'var(--tg-blue)' : 'var(--bg-secondary)',
        color: active ? 'white' : 'var(--text-secondary)',
        fontWeight: 500,
        fontSize: '14px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap'
      }}
    >
      {icon} {text}
    </button>
  );
}

const MailIcon = ({ color }: { color: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);
