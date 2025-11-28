🌌 Chronicle AI Editor

A modern AI-assisted writing experience inspired by Chronicle’s design philosophy.

<div align='center'><img width="2586" height="1430" alt="image" src="https://github.com/user-attachments/assets/d3f93d40-320e-4630-88f8-60fd80863d06" /></div>

🚀 Overview

Chronicle AI Editor is a fully-featured, production-ready AI-assisted text editor built with:

React + TypeScript

ProseMirror for rich-text editing

XState for predictable state management

Gemini 2.5 Flash for low-latency streaming text generation

Vite + Tailwind for a smooth, modern UI

Vercel for deployment

The app allows users to write, format, and generate text with real-time AI continuation — wrapped in a cinematic glassmorphic interface inspired by Chronicle.

👉 Live Demo: https://chronicle-h0wmq4fgm-adarsh-srikakolapus-projects.vercel.app/

👉 Video Walkthrough: Included in submission
👉 Tech Task: Chronicle Frontend Engineer Assignment

✨ Key Features
🧠 AI-Powered Writing

“Continue Writing” button streams text using Gemini 2.5 Flash

Smooth, human-like typing animation via chunk-queue & requestAnimationFrame

XState ensures safe transitions (idle → generating → success)

✍️ Rich Text Editing (ProseMirror)

Bold, italic, bullet list, ordered list

Undo/redo with history plugin

Image upload (inline image nodes)

Custom schema for lists + image nodes

🎨 Premium UI & UX

Chronicle-style spotlight hover title

Glassmorphism cards, animated gradients, atmospheric lighting

Smooth expand/reveal animation for the editor output

Full dark/light mode toggle

Custom scrollbars & high-end ProseMirror theme

🧩 Clean Architecture

Editor.tsx → UI + ProseMirror + streaming renderer

editorMachine.ts → XState machine controlling AI lifecycle

geminiService.ts → API abstraction + streaming logic

App.tsx → theme, layout, spotlight, global wrapper



⚙️ Setup & Run Locally
1️⃣ Install dependencies
npm install

2️⃣ Add Gemini API key

Create .env.local:

GEMINI_API_KEY=your_key_here

3️⃣ Start dev server
npm run dev

🌐 Deployment (Vercel)

Add environment variable in Vercel dashboard:
Key: GEMINI_API_KEY
Value: your Gemini key

Redeploy

Vite injects serverless endpoint + frontend reads streamed text

🧠 Engineering Choices (Why This Architecture?)

ProseMirror → industrial-grade editor with schema-level control

XState → no race conditions, deterministic transitions

Chunk Queue Typing → prevents jank and mimics human writing

Gemini Flash → fast streaming for interactive AI editing

Separation of Concerns → UI, state machine, and AI logic isolated

🎥 Demo (What to Look For)

Chronicle-style cinematic UI

Hover-responsive spotlight title

Smooth streaming of generated text

Rich text formatting

Image upload

New chat (“+”) and prompt input

Perfect theme transitions

Fully reactive editor experience

💡 About This Project

This project was built as part of the Chronicle Frontend Engineer Task, with emphasis on:

Solid React architecture

High-end UI craftsmanship

Clean state management

Deep understanding of ProseMirror

Seamless AI integration

Ability to explain, justify, and demo the entire implementation

📬 Author

Adarsh Gupta
GitHub: https://github.com/Adarshgupta1127
