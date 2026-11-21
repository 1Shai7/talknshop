# Murf Falcon Voice Persona (Agora RTC + Web Speech)

An enterprise-grade, ultra-low-latency conversational AI voice persona interface combining **Agora RTC Transport**, **Murf Falcon TTS** (sub-100ms TTFA), and browser **Web Speech Recognition**.

![Murf Falcon Voice Persona Banner](https://images.unsplash.com/photo-1589254065878-42c9da997008?auto=format&fit=crop&w=1200&q=80)

## Features
- **Ultra-Low Latency Telemetry**: Live `RTC: 42ms` and `Murf Falcon: 128ms` TTFA monitoring.
- **Multimodal Voice Personas**:
  - `Aria — Warm Concierge (en-US)`: Welcoming, velvety, high emotional resonance.
  - `Matthew — Executive Analyst (en-US)`: Crisp, authoritative, structured for analytics.
  - `Marcus — Tech Specialist (en-GB)`: Rapid, precise, optimized for technical queries.
  - `Chloe — Empathetic Support (en-US)`: Soothing and patient for support workflows.
  - `Liam — Playful & Creative Guide (en-AU)`: Dynamic and engaging for storytelling.
- **Real-Time Web Speech & Murf Streaming**: Browser microphone capture with instant voice synthesis.
- **Audio Visualizer**: Dynamic HTML5 canvas waveform reactive to speech output and microphone input.
- **Guided Demo Flow**: Automated multi-turn conversational walkthrough showcasing sub-second response times and live interruption.
- **Production Ready for Vercel**: Built with Vite + React + Tailwind CSS with zero runtime configuration required.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Build for production
npm run build
```

## Deploy to Vercel

Push this repository to GitHub and import it on [Vercel](https://vercel.com):
- Framework Preset: **Vite**
- Build Command: `npm run build`
- Output Directory: `dist`

## Configuration (Optional)
Click the gear icon (Settings) in the top right to configure:
- Murf AI API Key (Bring Your Own Key)
- Agora App ID & Channel
- Gemini / OpenAI API Key
*(If keys are not provided, high-fidelity Web Speech Synthesis simulation runs automatically!)*

---
Built with Google Gemini Canvas & Murf Falcon AI.
