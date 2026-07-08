# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Telegram-to-Lark (Feishu) webhook bridge deployed as Vercel serverless functions. Telegram sends bot updates to a webhook endpoint; the bot parses the message text, classifies it by content pattern, and forwards it to Lark as an interactive card (and optionally as a direct message to a specific person).

There is no build step, test suite, or lint script — this is a small, dependency-light Node project. The only tooling is Prettier formatting.

## Commands

```bash
npm install                # install dependencies
npx prettier --write .     # format all files (package.json declares lint-staged to do this on commit via husky, but no .husky/ directory is present in this repo — it is not currently wired up)
```

There are no `test`, `build`, or `lint` scripts defined in `package.json`.

## Architecture

### Request flow

Telegram webhook → `api/prod.js` or `api/error.js` (Vercel serverless functions, POST-only) → `lib/lark.js: sendMessage()` → parses + classifies the message, builds a Lark card → posts to a Lark incoming webhook URL (and optionally sends a Lark direct message via `lib/lark_bot.js`).

`api/prod.js` and `api/error.js` are nearly identical handlers; the only difference is `api/error.js` passes `type: "error"` into `sendMessage`, which redirects the card to a different Lark webhook URL (`LARK_WEBHOOK_URL_ERROR`) instead of the default one. `api/index.js` is just a health check that returns 204.

Vercel routing (`vercel.json`) maps every path to `/api/$1`, so the deployed webhook paths are literally `/prod` and `/error`, matching the file names under `api/`.

### Message classification (`lib/lark.js`)

Incoming text is matched against hardcoded substrings to pick one of these types (`MESSAGE_TYPES`, backed by `Symbol`s so they can key `TEMPLATE_COLORS` safely):

| Type | Match condition | Card color |
|---|---|---|
| `REPORTER_FARM` | contains `"REPORTER"` and `"FARM"` | wathet |
| `PROD_WPS_TEST` | contains `"Prod WPS test"` | green |
| `SERVICE_RESTART` | contains `"SERVICE RESTART"` | yellow |
| `NEW_ERROR_CODE` | contains `"New Error Code Found"` | orange |
| `APP_DOMAINS` | contains `"App Backup Domain test"` | orange |
| `IM_WS_DOMAINS` | contains `"IM WS Domain test"` | orange |
| `UNKNOWN` | none of the above | turquoise, but `parse()` returns `null` for this case, so `sendMessage` rejects and nothing is forwarded |

Each type has its own line-stripping rule in `parse()` (e.g. drop the first N header lines, bold text after `=`, drop separator lines containing `════`) before the remaining text becomes the card body. Adding a new message type means adding a branch to both `detectMessageType()` and `parse()`, plus a `TEMPLATE_COLORS` entry.

`buildCard()` produces a Lark "interactive" card (schema 2.0) with a title header and a body div containing the parsed content plus a `<local_datetime>` timestamp element.

### Reporter direct messages

When the type is `REPORTER_FARM` and a `REPORTER` value is extracted, `sendMessage` looks up an email via environment variable named after the lowercased reporter (or the part before the first `.` if the full name isn't set), e.g. reporter `John.Doe` checks `process.env["john.doe"]` then `process.env["john"]`. If found, it fires `sendMessageByEmail` (from `lib/lark_bot.js`) asynchronously, without awaiting or blocking the main webhook response.

### Lark API integration (`lib/lark_bot.js`)

- Caches the tenant access token in module-level variables (`cachedToken`/`tokenExpiresAt`) with a 5-minute safety margin; not persisted across cold starts.
- `sendMessageByEmail` sends a `post`-type direct message via `open-apis/im/v1/messages?receive_id_type=email`, using the reporter's email directly as `receive_id`. `getUserId` (email → `open_id` lookup via `contact/v3/users/batch_get_id`) is defined but currently unused by that flow.

### Shared helpers (`lib/lark_utils.js`)

Generic `REPORTER=`/`FARM=`/`STATUS=` line extractors built from a shared `createExtractor(key)` factory, plus `trim()` and `formatDateTime()` (dayjs, hardcodes a +8 hour offset for UTC+8 display regardless of server timezone).

## Environment Variables

```
LARK_WEBHOOK_URL          # default Lark incoming webhook
LARK_WEBHOOK_URL_ERROR    # used by api/error.js (type: "error")
LARK_WEBHOOK_URL_<TYPE>   # any other per-type override, matched uppercase against the `type` passed to sendMessage
LARK_APP_ID               # Lark app credentials, for tenant_access_token (direct messaging)
LARK_APP_SECRET
<reporter-name-lowercase> # e.g. `john.doe` or `john` — email address to DM when a REPORTER_FARM message names that reporter
```
