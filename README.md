# Financial Anomaly Detection Agent

An AI-powered application for detecting and investigating financial anomalies using Agentic RAG workflows (LangGraph). This project combines a FastAPI backend with a Next.js frontend to help security analysts rapidly review, investigate, and resolve suspicious transactions.

## 🌟 Key Features

- **Automated Anomaly Detection**: Evaluates incoming transactions for velocity flags, geo-anomalies, and spending deviations.
- **Agentic RAG Workflows**: Uses LangGraph to orchestrate multiple AI agents (Data Retriever, Root Cause Analyzer, Report Generator).
- **Vector Search (Pinecone)**: Retrieves semantically similar historical fraud cases to inform current investigations.
- **Reflection Loop**: An intelligent feedback mechanism that re-evaluates borderline cases for higher accuracy.
- **Modern Dashboard**: A responsive Next.js frontend (Tailwind CSS) for monitoring transactions and viewing detailed AI-generated investigation reports.

## 🏗️ Architecture

- **Backend**: Python, FastAPI, LangGraph, PostgreSQL, Pinecone, Gemini API (for embeddings), Groq API (for LLM inference).
- **Frontend**: Next.js (React), TypeScript, Tailwind CSS, Lucide React (icons).

---

## 🚀 Getting Started (Local Setup)

### Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL
- Pinecone Account
- Groq API Key & Gemini API Key

### 1. Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Set up environment variables:
   Copy `.env.example` to `.env` in the root folder (or inside `backend`) and fill in your keys (Groq, Gemini, Pinecone, DB URL).
5. (Optional) Seed the database & Pinecone index:
   ```bash
   python scripts/seed_postgres_bulk.py
   python scripts/seed_pinecone_from_csv.py
   ```
6. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will run at `http://localhost:8000`.

### 2. Frontend Setup

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Create a `.env.local` file and add:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will run at `http://localhost:3000`.

---

## 🌍 Deployment

- **Backend**: Can be deployed as a Web Service on [Render](https://render.com/) using the included `render.yaml`.
- **Frontend**: Best deployed on [Vercel](https://vercel.com/) by importing the GitHub repository and setting the root directory to `frontend`.

Make sure to set the respective environment variables on both platforms, and update `ALLOWED_ORIGINS` in your backend so the Vercel frontend can communicate with it.
