# slave.

A quiet late-night study site: a Pomodoro timer laid out as a lap of Monaco, a weekly planner, an AI study tutor, and a chat for messaging other people.

## Run it

```powershell
npm install
npm run dev
```

Open http://127.0.0.1:5173. `npm run dev` starts two things together: the website and a small study server (port 8787) that runs the tutor, file uploads and chat.

## Set up the study tutor

The tutor uses Claude (Opus 5.5). It needs an API key, which stays on the server and is never sent to the browser.

1. Create a key at https://platform.claude.com/settings/keys.
2. Open `.env.local` in this folder and paste it after `ANTHROPIC_API_KEY=`.
3. Stop the site (Ctrl+C in the terminal) and run `npm run dev` again.

`.env.local` is in `.gitignore`, so the key never goes to GitHub. Every question to the tutor costs a little on your Claude account. Attached files are cached between questions to keep that down.

What the tutor accepts: PDFs, Word documents (.docx), images (PNG, JPEG, GIF, WebP, under 5 MB) and text files, up to 20 MB each.

## Chat with other people

The **chat** page has a shared "study hall" room plus direct messages. Messages are stored on the study server in `server/data/chat.json`.

Other people can only reach the chat if they can reach your computer:

- **Same Wi-Fi:** run `npm run dev:share` instead. Vite prints a "Network" address such as `http://192.168.1.20:5173`; others open that. Windows may ask to allow Node.js through the firewall.
- **Anywhere on the internet:** the site and server need to be hosted online (for example on Render or Railway).

There are no passwords: anyone who can open the chat can pick any name. Fine for friends, not for anything private.

## What's saved where

- Timer settings, planner tasks, study sessions and tutor conversations: in your browser (the planner has a backup option).
- Uploaded files and chat messages: in `server/data/` on this computer (not uploaded to GitHub).

## Parked

The Spotify CD player and the first tutor prototype are kept in `parked/` (not built).
