# Termux (Android) — Localhost Setup Guide

This guide describes how to run the **Jarvis AI Assistant** locally on your Android device using **Termux**.

## 1. System Update & Dependencies

Open Termux and type these commands:

```bash
# Update package repositories
apt update && apt upgrade -y

# Install Node.js and basic build utilities
apt install nodejs -y
```

Verify your installation:
```bash
node -v
npm -v
```

---

## 2. Accessing the Project Directory

Grant Termux permission to access your device's internal storage if needed:
```bash
termux-setup-storage
```

Now navigate to your project directory. For example, if you stored or extracted your project folder inside your phone's default Downloads folder:
```bash
cd /sdcard/Download/44444444444444-main
```

---

## 3. Install Dependencies

Install all node libraries inside the directory:
```bash
npm install
```

---

## 4. Setup Environment Secrets

Create your local environment configuration file:
```bash
cp .env.example .env
```

Use `nano` (or any CLI editor) to complete your API Key setups:
```bash
# install nano if not already present
apt install nano -y

# edit .env
nano .env
```

Add your credentials safely:
```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
APP_URL=http://localhost:3000
```
- Tap `Ctrl + O` then `Enter` to save the file.
- Tap `Ctrl + X` to exit.

---

## 5. Launch Dev Server

Boot the typescript server engine using:
```bash
npm run dev
```

Once running successfully in your Termux window, open Chrome, Kiwi, or any mobile browser of choice and go to:
👉 **[http://localhost:3000](http://localhost:3000)**
