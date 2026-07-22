# Croqly

Transform your favorite Instagram cooking videos into detailed, easy-to-follow recipes using AI-powered transcription and processing.

## About

This project was created using [Lovable](https://lovable.dev/projects/b1808364-f20c-47fd-a150-524b51c602b7), an AI-powered development platform.

## Features

- **Extract Description**: Automatically captures recipe details from Instagram post captions
- **Video Transcription**: Converts video instructions into text format
- **AI Processing**: Synthesizes information into a structured recipe format
- **Illustration Generation**: Creates visual representations of the dishes

## Technologies Used

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Prisma (SQLite)
- Mistral AI

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/jungfish/croqly.git
cd croqly
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Set up your environment variables
```bash
cp .env.example .env
```
Edit the `.env` file with your Mistral API key:
```
MISTRAL_API_KEY=your_api_key_here
```

4. Initialize the database
```bash
npx prisma db push
```

5. Start the development server
```bash
npm run dev
# or
yarn dev
```

The app should now be running at `http://localhost:5173`

## Development

You can edit this project in several ways:

1. **Using Lovable**: Visit the [Lovable Project](https://lovable.dev/projects/b1808364-f20c-47fd-a150-524b51c602b7) and start prompting
2. **Local Development**: Clone and run locally using your preferred IDE
3. **GitHub Codespaces**: Launch a codespace from the repository

## Usage

1. Visit the homepage
2. Paste an Instagram recipe URL (supports both Reels and Posts)
3. Click "Generate Recipe"
4. Wait for the AI to process the content
5. View your structured recipe with ingredients and instructions

## Author

Matthieu Jungfer - [GitHub](https://github.com/jungfish/croqly)

Made with ❤️ using React, TypeScript, and AI

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
