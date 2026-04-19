# Briva

AI-powered meeting notes tool optimised for Hong Kong professionals. Handles English + Cantonese code-mixed meetings.

## Features

- 🎙️ Record or upload meeting audio
- 🗣️ Bilingual transcription (English + Cantonese)
- 🤖 AI-generated summaries, action items, and key decisions
- 📤 Export to PDF or Email
- 🔒 Secure and private (your data, your control)

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Web App**: Next.js 15 (App Router)
- **Chrome Extension**: Manifest V3
- **Backend**: Supabase (Auth, Postgres, Storage, Edge Functions)
- **STT**: Deepgram Nova-2 + Google Cloud STT
- **AI**: Claude Sonnet 4.5
- **Payments**: Stripe
- **UI**: Tailwind CSS + Shadcn/ui

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI
- API keys: Supabase, Deepgram/Google Cloud, Anthropic, Stripe

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your API keys in .env

# Run Supabase migrations
cd supabase
supabase db reset
cd ..

# Start development servers
pnpm dev
```

The web app will be available at http://localhost:3000

## Project Structure

```
briva/
├── apps/
│   ├── web/          # Next.js dashboard
│   └── extension/    # Chrome extension
├── packages/
│   └── shared/       # Shared types and utilities
├── supabase/
│   ├── migrations/   # Database migrations
│   └── functions/    # Edge functions
└── turbo.json        # Turborepo config
```

## Development

```bash
# Run all apps in dev mode
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Clean all build artifacts
pnpm clean
```

## License

MIT
