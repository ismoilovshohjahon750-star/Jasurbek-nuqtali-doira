# Jarvis AI Assistant — Localhost Setup Guide

This guide will help you set up and run the **Jarvis AI Assistant** application on your local machine (`localhost`).

## Prerequisites

Before starting, make sure you have the following installed on your system:
- **Node.js** (v18.0.0 or higher is highly recommended)
- **npm** (usually comes bundled with Node.js) or **yarn** / **pnpm**

---

## 1. Project Setup

Follow these steps to configure the project locally:

### 1.1 Extract or Clone the Project
If you exported the project as a `.zip` file, extract it to a directory of your choice. Alternatively, clone the repository if integrated with GitHub.

### 1.2 Install Dependencies
Open your terminal inside the project root folder and install the required npm packages:
```bash
npm install
```

---

## 2. Configuration (Environment Variables)

This application integrates with external APIs (**Gemini**, **Groq**, and **OpenRouter**). You need to supply your API keys.

1. In the project root, rename `.env.example` to `.env` or create a new file named `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open the `.env` file in your favorite text editor and fill in your actual API keys:
   ```env
   # .env
   GEMINI_API_KEY=your_gemini_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   OPENROUTER_API_KEY=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
   APP_URL=http://localhost:3000
   ```

*(Note: Your OpenRouter API key has already been preset for your convenience).*

---

## 3. Running the Application

You can run the application in two modes:

### 3.1 Development Mode (Recommended for testing/editing)
This starts the development server with Vite middleware hot-reloading:
```bash
npm run dev
```
Once started, open your browser and navigate to:
**[http://localhost:3000](http://localhost:3000)**

### 3.2 Production Mode
If you want to compile the TypeScript files and run a production-ready build:
1. Compile the frontend assets and server pack:
   ```bash
   npm run build
   ```
2. Start the production server:
   ```bash
   npm run start
   ```

---

## 4. Key Project Architecture

- **Server (`server.ts`)**: Integrates Express, WebSockets for audio stream, Whisper API via Groq configuration, and the Gemini API, routing all requests securely from client to avoid key exposure.
- **Frontend (`src/App.tsx` & `src/main.tsx`)**: Responsive, high-fidelity user interface built with React, Vite, Tailwind CSS, Lucide icons, and Motion animation physics library.
- **Vite Configuration (`vite.config.ts`)**: Serves single page assets dynamically alongside Express.
