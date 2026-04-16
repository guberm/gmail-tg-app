# 📧 GMail for Telegram (Mini App)

A sleek, robust Telegram Mini App built with React & Vite that seamlessly functions as a fully operational Gmail client right within Telegram! Read, compose, search, delete, and fully organize labels on your emails without ever switching apps.

## ✨ Features
- 🔐 **Secure Google OAuth 2.0**: Effortlessly sign in directly leveraging `@react-oauth/google` implicit token flows.
- 📥 **Inbox & Unread Badges**: Quickly flip between Inbox, Sent, and Drafts tabs.
- 📖 **Embedded HTML Viewer**: Renders full rich-text styled HTML emails safely within an isolated iframe.
- 📤 **Compose & Reply**: Draft entirely new emails or reply with full threaded support.
- 🗑️ **Telegram Native Integration**: Leverages native Telegram Confirm buttons for high-risk actions (like deleting/trashing).
- 🏷️ **Label Management**: Edit your personalized Google Account labels instantly!
- 🎨 **Dynamic Dark Mode UI**: Crafted around the Telegram premium aesthetic featuring custom HSL colors and `glassmorphism`.

## 🚀 Getting Started

### 1. Configure Google OAuth Credentials
Before executing this natively, you will need to grant yourselves access via Google Cloud:
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Head to **APIs & Services -> OAuth consent screen**. Create an **External** configuration. (You won't need to actually publish it if it's for personal use! Just add your email as a Test User).
3. Under **Credentials**, hit **Create Credentials** -> **OAuth Client ID**.
4. Select **Web application**.
5. Add your server link to **both** the "Authorized JavaScript origins" AND "Authorized redirect URIs" sections.
    - Setup for local testing: `http://localhost:5173`
    - Setup for production: *Insert your live URL (e.g., Vercel App Link)*
6. Copy the uniquely generated `Client ID`.

### 2. Configure Local Environment
Clone the repository, and replace the placeholder variable in your environment:
```bash
cp .env.example .env
```
Inside your new `.env` file, paste your newly acquired `Client ID`:
```env
VITE_GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
```

### 3. Spin Up Development Server
Run Vite's lightning fast HMR server to test things out:
```bash
npm install
npm run dev
```

### 4. Deploying to Telegram!
Once you host your app natively on the internet (like simply linking this Repository to Vercel free-tier):
1. Head to Telegram and talk to **@BotFather**.
2. Run `/newbot` and follow the quick setup steps.
3. Open Bot Settings -> **Menu Button** -> **Configure menu button**.
4. Insert the live `https://` link of your natively hosted app!

The app will now reliably deploy right over your Telegram Chat context whenever launched!
