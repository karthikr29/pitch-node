# PitchNode - Landing Page

**The Science of Sales Performance**

A modern "Coming Soon" landing page for PitchNode, an AI-powered sales training platform where sales professionals practice live voice conversations against intelligent AI buyer personas.

## Features

- **Responsive Design**: Fully responsive layout that works on all devices
- **Dark/Light Theme**: System-aware theme with smooth transitions and persistence
- **TypeForm-Style Waitlist**: Multi-step animated form with validation (4 steps: name, email, role, experience)
- **Animated 3D Elements**: CSS-based 3D animations that can be upgraded to Spline
- **Framer Motion Animations**: Smooth scroll and entrance animations
- **Supabase Integration**: Waitlist signups stored in Supabase PostgreSQL database
- **Webhook Integration**: n8n webhook triggered on form submission for automated workflows (e.g., welcome emails)

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS with CSS custom properties
- **Animations**: Framer Motion
- **3D Elements**: CSS-based (upgradeable to Spline)
- **Icons**: Lucide React
- **Fonts**: Inter + Cabinet Grotesk
- **Database**: Supabase (PostgreSQL)
- **Automation**: n8n webhooks

## Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd pitch-node

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### Getting Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Navigate to **Settings** → **API**
4. Copy the **Project URL** and **anon/public** key

#### Vercel Deployment

When deploying to Vercel, add the following environment variables in **Project Settings** → **Environment Variables**:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g., `https://xxxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous/public API key |

> **Note**: Both variables are prefixed with `NEXT_PUBLIC_` because they are used on the client side. The anon key is safe to expose as it only allows operations permitted by your Row Level Security (RLS) policies.

#### Supabase Database Setup

The project uses a `waitlist_signups` table with the following schema:

```sql
CREATE TABLE waitlist_signups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  experience_rating INTEGER NOT NULL,
  job_role TEXT,
  source TEXT DEFAULT 'website',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Allow anonymous inserts" ON waitlist_signups
  FOR INSERT WITH CHECK (true);

-- Allow anonymous reads (for duplicate checking and count)
CREATE POLICY "Allow anonymous reads" ON waitlist_signups
  FOR SELECT USING (true);
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts, theme provider
│   ├── page.tsx            # Main landing page
│   ├── globals.css         # Theme variables, base styles
│   ├── actions.ts          # Server actions for Supabase + webhook
│   ├── providers.tsx       # Theme + Waitlist provider wrapper
│   └── api/
│       └── waitlist-count/ # API route for waitlist count
├── components/
│   ├── ui/                 # Button, Input, Modal, ProgressBar
│   ├── layout/             # Header, Footer, ThemeToggle
│   ├── sections/           # Hero, ProblemSolution, HowItWorks, etc.
│   ├── waitlist/           # WaitlistModal, form steps (Name, Email, Role, Experience), ThankYou
│   └── 3d/                 # Animated 3D scene components
├── contexts/
│   └── waitlist-context.tsx # Shared modal state across app
├── lib/
│   ├── supabase.ts         # Supabase client + database operations
│   ├── validators.ts       # Form validation utilities
│   └── utils.ts            # cn() helper, misc utilities
├── hooks/
│   └── use-waitlist-form.ts # Form state management (4-step flow)
└── fonts/                  # Cabinet Grotesk font files
```

## Color Theme

### Light Theme
- Background: Warm White (#FAFAF9)
- Text: Stone 900 (#1C1917)
- Accent: Deep Teal (#0D9488)
- Secondary: Amber (#F59E0B)

### Dark Theme
- Background: Stone 950 (#0C0A09)
- Text: Stone 50 (#FAFAF9)
- Accent: Teal 400 (#2DD4BF)
- Secondary: Amber 400 (#FBBF24)

## Sections

1. **Hero**: Full-height hero with animated microphone 3D element
2. **Problem/Solution**: Two-column comparison cards
3. **How It Works**: 3-step process with numbered cards
4. **Features**: Alternating content rows with 3D elements
5. **Personas**: Target audience cards (SDRs, AEs, Managers)
6. **Final CTA**: Centered call-to-action with trust indicator
7. **Footer**: Logo, links, social icons

## Upgrading 3D Elements

The current 3D elements are CSS-based animations. To upgrade to Spline:

1. Create your scenes in [Spline](https://spline.design)
2. Export as React components
3. Replace the contents of components in `src/components/3d/`

Example:
```tsx
import Spline from '@splinetool/react-spline';

export default function HeroScene() {
  return <Spline scene="https://prod.spline.design/..." />;
}
```

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

MIT

---

Built with ❤️ for sales professionals who want to master their craft.
