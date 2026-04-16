import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchEmails, getUnreadCount } from '../api/gmail';
import type { EmailMessage } from '../api/gmail';
import { useNavigate } from 'react-router-dom';
import { Search, Edit3, LogOut, Inbox, Send, FileText, Star } from 'lucide-react';
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

  const loadEmails = async (searchQuery = '') => {
    if (!accessToken) return;
    setLoading(true);
    const msgs = await fetchEmails(accessToken, folder, 20, searchQuery);
    setEmails(msgs);
    setLoading(false);
  };

  const loadUnread = async () => {
    if (!accessToken) return;
    const count = await getUnreadCount(accessToken);
    setUnreadCount(count);
  };

  useEffect(() => {
    loadEmails(search);
    loadUnread();
  }, [folder, accessToken]);

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
        <button className="btn-icon" onClick={logout} title="Logout">
          <LogOut size={20} />
        </button>
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
          <div className="flex-center" style={{ height: '200px', flexDirection: 'column', color: 'var(--text-secondary)' }}>
            <Inbox size={48} opacity={0.5} style={{ marginBottom: '16px' }} />
            <p>No messages found</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {emails.map((email) => (
              <div 
                key={email.id}
                className="animate-fade-in"
                onClick={() => navigate(`/email/${email.id}`)}
                style={{
                  display: 'flex',
                  padding: '12px 8px',
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-md)',
                  transition: 'background 0.2s',
                  background: email.unread ? 'rgba(51, 144, 236, 0.05)' : 'transparent',
                  borderLeft: email.unread ? '3px solid var(--tg-blue)' : '3px solid transparent'
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '8px' }}>
                      {email.starred && <Star size={14} fill="var(--accent-yellow)" color="var(--accent-yellow)" />}
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
