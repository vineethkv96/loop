# Loop

A personal todo app that keeps reminding you about open tasks at a configurable interval. It has a web UI with browser localStorage and native browser notifications.

## Features

- Web UI with open / done / all filters and priority levels
- Configurable reminder interval (default: every 60 minutes)
- Browser notifications
- Data stored in localStorage — no database required

## Requirements

- Node.js 18+
- pnpm

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start the app:

   ```bash
   pnpm start
   ```

3. Open <http://localhost:4000>.

## Reminder configuration

Reminder settings are stored in localStorage and can be changed from the web UI:

- `intervalMinutes` — how often to remind, in minutes (default 60, min 1)
- `enabled` — whether the scheduler fires at all
- `remindWhenEmpty` — whether to notify when there are no open tasks

Changing the interval resets the countdown so the new schedule takes effect immediately.

## Project structure

```
src/server.js         Express static file server
public/
  index.html          Web UI markup
  app.js              Frontend logic
  storage.js          localStorage data layer
  styles.css          Styles
```
