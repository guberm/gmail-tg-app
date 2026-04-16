export interface EmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  subject: string;
  from: string;
  date: string;
  unread: boolean;
  internalDate: string;
}

export interface EmailDetail extends EmailMessage {
  body: string;
  plainText: string;
  htmlText: string;
  labels: string[];
}

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me';

// Helper to get headers for fetching
function getHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// Fetch list of emails
export async function fetchEmails(token: string, folder = 'INBOX', maxResults = 20, query = ''): Promise<EmailMessage[]> {
  try {
    let q = '';
    if (folder === 'INBOX') q += 'in:inbox ';
    if (folder === 'SENT') q += 'in:sent ';
    if (folder === 'DRAFT') q += 'in:draft ';
    if (query) q += query;

    const url = `${GMAIL_API_BASE}/messages?maxResults=${maxResults}&q=${encodeURIComponent(q.trim())}`;
    const response = await fetch(url, { headers: getHeaders(token) });
    if (!response.ok) throw new Error('Failed to fetch messages list');
    
    const data = await response.json();
    if (!data.messages) return [];

    // Fetch details for each message
    const messages = await Promise.all(
      data.messages.map((msg: { id: string }) => fetchEmailSnippet(token, msg.id))
    );
    
    return messages.filter((m): m is EmailMessage => m !== null);
  } catch (error) {
    console.error('Error fetching emails:', error);
    return [];
  }
}

// Fetch basic email details for list view
async function fetchEmailSnippet(token: string, id: string): Promise<EmailMessage | null> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/messages/${id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`, { headers: getHeaders(token) });
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const headers = data.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    // Clean up "From" name
    const rawFrom = getHeader('From');
    const fromMatch = rawFrom.match(/^(.*?)\s*<.*>$/);
    const from = fromMatch ? fromMatch[1].replace(/"/g, '') : rawFrom;

    return {
      id: data.id,
      threadId: data.threadId,
      snippet: data.snippet,
      subject: getHeader('Subject') || '(No Subject)',
      from: from,
      date: getHeader('Date'),
      unread: data.labelIds?.includes('UNREAD') || false,
      internalDate: data.internalDate
    };
  } catch (e) {
    return null;
  }
}

// Decode base64 URL safe
function decodeBase64UrlSafe(str: string) {
  return decodeURIComponent(
    atob(str.replace(/-/g, '+').replace(/_/g, '/'))
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
}

// Parse body parts to get HTML and Plain text
function parsePayload(payload: any): { html: string, plain: string } {
  let html = '';
  let plain = '';

  if (!payload) return { html, plain };

  if (payload.body?.data) {
    const text = decodeBase64UrlSafe(payload.body.data);
    if (payload.mimeType === 'text/html') html = text;
    else if (payload.mimeType === 'text/plain') plain = text;
  }

  if (payload.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        plain = decodeBase64UrlSafe(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        html = decodeBase64UrlSafe(part.body.data);
      } else if (part.parts) {
        const subParts = parsePayload(part);
        if (subParts.html) html += subParts.html;
        if (subParts.plain) plain += subParts.plain;
      }
    }
  }

  return { html, plain };
}

// Fetch full email content
export async function fetchFullEmail(token: string, id: string): Promise<EmailDetail | null> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/messages/${id}?format=full`, { headers: getHeaders(token) });
    if (!response.ok) return null;
    
    const data = await response.json();
    
    const headers = data.payload?.headers || [];
    const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    const { html, plain } = parsePayload(data.payload);

    return {
      id: data.id,
      threadId: data.threadId,
      snippet: data.snippet,
      subject: getHeader('Subject') || '(No Subject)',
      from: getHeader('From'),
      date: getHeader('Date'),
      unread: data.labelIds?.includes('UNREAD') || false,
      internalDate: data.internalDate,
      labels: data.labelIds || [],
      htmlText: html,
      plainText: plain,
      body: html || plain || '(No content)'
    };
  } catch (error) {
    console.error('Error fetching full email:', error);
    return null;
  }
}

export async function sendEmail(token: string, to: string, subject: string, bodyText: string) {
  try {
    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      bodyText
    ].join('\n');

    // Base64 URL safe encode
    const encodedEmail = btoa(unescape(encodeURIComponent(message)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await fetch(`${GMAIL_API_BASE}/messages/send`, {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({ raw: encodedEmail })
    });

    if (!response.ok) throw new Error('Failed to send email');
    return await response.json();
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function trashEmail(token: string, id: string) {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/messages/${id}/trash`, {
      method: 'POST',
      headers: getHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to trash email');
    return true;
  } catch (error) {
    console.error('Error trashing email:', error);
    throw error;
  }
}

export async function getUnreadCount(token: string): Promise<number> {
  try {
    const response = await fetch(`${GMAIL_API_BASE}/labels/INBOX`, { headers: getHeaders(token) });
    if (!response.ok) return 0;
    const data = await response.json();
    return data.messagesUnread || 0;
  } catch (e) {
    return 0;
  }
}
