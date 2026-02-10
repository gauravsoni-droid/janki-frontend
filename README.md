# Janki Frontend

A modern Next.js frontend application for the Janki Knowledge Base Chatbot. This application provides an intuitive interface for managing documents and interacting with an AI-powered chatbot that can answer questions based on your uploaded knowledge base.

## Features

- **Document Management**: Upload, view, and manage documents (PDF, DOCX, TXT, MD)
- **AI Chat Interface**: Interactive chat with support for multiple knowledge scopes (My Knowledge, Company Knowledge, All)
- **Markdown Rendering**: Beautiful markdown rendering with syntax highlighting for code blocks
- **Authentication**: Secure authentication using NextAuth.js with Google OAuth
- **Chat History**: View, rename, pin, and manage your chat conversations
- **Responsive Design**: Modern, mobile-friendly UI built with Tailwind CSS

## Tech Stack

- **Framework**: Next.js 14.2
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **HTTP Client**: Axios
- **Markdown**: react-markdown with remark-gfm
- **Syntax Highlighting**: react-syntax-highlighter

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see backend repository)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/gauravsoni-droid/janki-frontend.git
cd janki-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXT_PUBLIC_API_URL=http://localhost:8000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run e2e` - Run end-to-end tests

## Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   │   ├── (auth)/       # Authenticated routes
│   │   │   ├── dashboard/    # Chat interface
│   │   │   ├── documents/    # View documents
│   │   │   └── manage-documents/  # Upload/manage documents
│   │   ├── api/          # API routes (NextAuth)
│   │   └── login/        # Login page
│   ├── components/       # React components
│   │   └── ui/           # UI components
│   ├── lib/              # Utility libraries
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript type definitions
├── public/               # Static assets
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

## Features Overview

### Document Management
- Upload documents with categories (Frontend, Backend, Architecture, etc.)
- Create text-based documents in-app
- View documents with signed URLs
- Delete documents
- Filter by knowledge scope (My/Company/All)

### Chat Interface
- Multiple knowledge scopes (My Knowledge, Company Knowledge, All)
- Chat history with pin/rename/delete functionality
- Markdown rendering with syntax highlighting
- Source document references
- Real-time responses

### Authentication
- Google OAuth integration
- Secure session management
- Protected routes

## Deployment

This project is configured for deployment on Vercel. The `vercel.json` file contains the deployment configuration.

### Deploy to Vercel

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables
4. Deploy

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.

