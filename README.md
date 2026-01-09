# PitchNode - Landing Page

**The Science of Sales Performance**

A modern "Coming Soon" landing page for PitchNode, an AI-powered sales training platform where sales professionals practice live voice conversations against intelligent AI buyer personas.

## Features

- **Responsive Design**: Fully responsive layout that works on all devices
- **Dark/Light Theme**: System-aware theme with smooth transitions and persistence
- **TypeForm-Style Waitlist**: Multi-step animated form with validation
- **Animated 3D Elements**: CSS-based 3D animations that can be upgraded to Spline
- **Framer Motion Animations**: Smooth scroll and entrance animations
- **Airtable Integration**: Waitlist signups stored in Airtable via REST API

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Styling**: Tailwind CSS with CSS custom properties
- **Animations**: Framer Motion
- **3D Elements**: CSS-based (upgradeable to Spline)
- **Icons**: Lucide React
- **Fonts**: Inter + Cabinet Grotesk
- **Database**: Airtable

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

To enable Airtable integration, create a `.env.local` file:

```env
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=appIEyYTdOAODDzE7
```

Get your Airtable API key from [https://airtable.com/account](https://airtable.com/account).

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with fonts, theme provider
│   ├── page.tsx            # Main landing page
│   ├── globals.css         # Theme variables, base styles
│   ├── actions.ts          # Server actions for Airtable
│   └── providers.tsx       # Theme provider wrapper
├── components/
│   ├── ui/                 # Button, Input, Modal, ProgressBar
│   ├── layout/             # Header, Footer, ThemeToggle
│   ├── sections/           # Hero, ProblemSolution, HowItWorks, etc.
│   ├── waitlist/           # WaitlistModal, form steps, ThankYou
│   └── 3d/                 # Animated 3D scene components
├── lib/
│   ├── airtable.ts         # Airtable API client
│   ├── validators.ts       # Form validation utilities
│   └── utils.ts            # cn() helper, misc utilities
├── hooks/
│   └── use-waitlist-form.ts # Form state management
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
