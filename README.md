# MediQuest

A Next.js 14 application with TypeScript, Tailwind CSS, and Shadcn/UI integration.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
The `.env.local` file has been created in the root directory. Fill in the following variables:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
OPENAI_API_KEY=your_openai_api_key
```

**Note:** The `NEXT_PUBLIC_` prefix is required for Supabase variables as they need to be accessible in the browser.

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
  app/          # Next.js 14 App Router pages
  components/   # React components
  lib/          # Utility libraries and configurations
  hooks/        # Custom React hooks
  pages/        # Additional pages (if using Pages Router)
  utils/        # Utility functions
  styles/       # Additional stylesheets
```

## Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/UI** - Modern component library
- **Supabase** - Backend as a service
- **OpenAI** - AI integration
- **React Hook Form** - Form management
- **Zod** - Schema validation
- **Chart.js** - Data visualization
- **Lucide React** - Icon library

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

