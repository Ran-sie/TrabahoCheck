# TrabahoCheck

![Laravel](https://img.shields.io/badge/Laravel-13-FF2D20?logo=laravel&logoColor=white)
![PHP](https://img.shields.io/badge/PHP-8.3-777BB4?logo=php&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)
[![CI](https://github.com/Ran-sie/TrabahoCheck/actions/workflows/ci.yml/badge.svg)](https://github.com/Ran-sie/TrabahoCheck/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/License-MIT-green)

**A job-scam detector for Filipino job seekers.** Paste a job link or the post text, or upload a screenshot, and get a scam-risk score with plain-language reasons, in English or Taglish.

> *Trabaho* is Filipino for "work".

**Live demo:** https://trabaho-check.vercel.app

> The backend runs on a free server, so the very first request after a long idle period can take a few seconds.

## Features

- **Rule-based scam analysis**: detects upfront fees, fake cheques, task/commission scams, chat-only recruiters, unrealistic pay, free-email recruiters, and more. Supports English and Taglish phrasing.
- **Company check**: looks up the domains and emails named in the post (existence and age) without ever opening the site.
- **Optional AI second opinion**: any OpenAI-compatible provider (Groq, OpenRouter) or fully local via Ollama, shown next to the rule result.
- **Screenshot input**: in-browser OCR (Tesseract.js), so images never leave your machine.
- **Accounts and resume tools**: sign up, keep a profile, upload a resume (PDF) and auto-fill your profile from it.
- **Browser extension**: reads the job post from your own browser, so sites like Indeed, Upwork and LinkedIn are not blocked.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tesseract.js |
| Backend | Laravel 13 (PHP 8.3), Sanctum token auth, rate limiting |
| Database | SQLite locally, PostgreSQL (Supabase) in production, with row-level security |
| AI | Any OpenAI-compatible API (Groq, OpenRouter) or Ollama |
| Extension | Chrome/Edge/Brave (Manifest V3) |
| Tests | PHPUnit feature and unit tests |

## Project structure

```
backend/    Laravel API: scam rules, company checker, AI reviewer, auth, resume parsing
frontend/   React + TypeScript web app
extension/  Browser extension
docs/design Original UI/UX design files
```

## Getting started

**Requirements:** PHP 8.3+, Composer, Node.js 20+

```bash
# Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve

# Frontend (second terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. On Windows you can double-click `run-backend.bat` and `run-frontend.bat` instead.

### AI second opinion (optional)

Off until you add a key. Job text is sent to the provider you choose.

**Groq (free key):** create a key at https://console.groq.com, then set in `backend/.env`:

```
AI_BASE_URL=https://api.groq.com/openai/v1
AI_API_KEY=your-key-here
AI_MODEL=openai/gpt-oss-120b
```

**Ollama (fully local):** run `ollama pull llama3.2`, then set:

```
AI_BASE_URL=http://localhost:11434/v1
AI_API_KEY=ollama
AI_MODEL=llama3.2
```

Restart the backend after changing `.env`.

## API

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/check` | Analyze a job post (rules and company check) |
| POST | `/api/ai-review` | AI second opinion |
| POST | `/api/register`, `/api/login` | Authentication |
| GET/PUT | `/api/me` | Profile |
| POST/GET/DELETE | `/api/me/resume` | Resume upload, view, delete |
| POST | `/api/me/resume/autofill` | Fill profile from resume |

All public endpoints are rate limited.

## Testing

```bash
cd backend && php artisan test
```

## Disclaimer

TrabahoCheck gives a risk estimate, not a verdict. Always verify an employer independently and never pay to get a job.

## License

[MIT](LICENSE)
