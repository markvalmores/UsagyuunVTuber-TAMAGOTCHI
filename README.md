# Usagyuuun VTuber Experience 🐰

A high-energy, real-time interactive VTuber web application featuring the hyper-active rabbit Usagyuuun, powered by the Gemini Live API.

## Features
- **Real-time Voice & Audio Interaction**: Talk naturally with Usagyuuun using the Gemini 2.5 Flash Native Audio Preview model.
- **Dynamic Avatar States**: Watch Usagyuuun listen, talk, vibrate with excitement, or react idly.
- **In-App API Key Manager**: Securely configure and save your Gemini API key directly in your browser.
- **Vercel & GitHub Ready**: Fully configured for instant deployment on Vercel and GitHub Pages / Actions CI.

---

## Getting Started

1. **Clone or Open Repository**
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` or `.env.local` and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *(Alternatively, you can enter your API key directly in the app via the "API Key" button in the header).*
4. **Run Development Server**:
   ```bash
   npm run dev
   ```

---

## Deployment

### Vercel
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. The project includes a pre-configured `vercel.json` file.
4. Add your `GEMINI_API_KEY` (or `VITE_GEMINI_API_KEY`) environment variable in the Vercel project settings.
5. Deploy!

### GitHub Actions
The repository includes `.github/workflows/deploy.yml` which automatically builds and tests your application on every push. Add `GEMINI_API_KEY` as a repository secret in GitHub Settings → Secrets and variables → Actions.
