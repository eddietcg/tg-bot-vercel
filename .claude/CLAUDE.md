# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Telegram-to-Lark webhook bot deployed on Vercel. Receives Telegram messages via webhook and forwards them to Lark (Feishu) with formatted cards.

## Architecture

### Message Flow
1. Telegram webhook → `/api/prod.js` (Vercel serverless function)
2. Message parsing → `lib/lark.js` (type detection, content extraction, card formatting)
3. Lark API → Send formatted card via webhook or direct message

### Key Components

**API Handlers** (`/api/`)
- `index.js` - Health check endpoint (returns 204)
- `prod.js` - Main webhook handler for Telegram messages
- `error.js` - (If exists) Error handling endpoint

**Library** (`/lib/`)
- `lark.js` - Core message parsing and Lark card building
  - Detects 4 message types: REPORTER_FARM, PROD_WPS_TEST, SERVICE_RESTART, NEW_ERROR_CODE
  - Parses Telegram messages into structured content
  - Builds Lark interactive cards with color templates
- `lark_bot.js` - Lark API integration (tenant token caching, direct messaging by email)

### Message Type Detection
Messages are classified by content patterns:
- **REPORTER_FARM**: Contains "REPORTER" and "FARM" keywords
- **PROD_WPS_TEST**: Contains "Prod WPS test"
- **SERVICE_RESTART**: Contains "SERVICE RESTART"
- **NEW_ERROR_CODE**: Contains "New Error Code Found"

Each type has specific parsing rules and card colors (wathet/green/yellow/orange).

## Development

### Environment Variables Required
```
LARK_WEBHOOK_URL          # Default Lark webhook
LARK_WEBHOOK_URL_<TYPE>   # Type-specific webhooks (optional)
LARK_APP_ID               # For direct messaging via lark_bot.js
LARK_APP_SECRET           # For direct messaging via lark_bot.js
```

### Local Development
```bash
# Install dependencies
npm install

# Format code (husky + lint-staged configured for pre-commit)
npx prettier --write .
```

### Deployment
Automatically deployed to Vercel via git push. Uses `vercel.json` routing:
- All routes → `/api/$1`
- Root `/` → `/api/index.js`

## Code Style
- **ES Modules**: Use `import/export` (package.json has `"type": "module"`)
- **Formatting**: Prettier configured (`.prettierrc.json`)
- **Pre-commit**: Husky + lint-staged auto-formats JS files

## Telegram Webhook Setup
Set webhook URL to: `https://your-vercel-domain.vercel.app/prod`

Webhook expects Telegram Update object with:
- `message` or `channel_post` containing `text`, `message_id`, `chat.id`
