# beRichHub A RAG Chatbot

This project is a Open-Sourcce **Retrieval Augmented Generation (RAG)** chatbot trained on data => part of [beRichHub](https://www.coldbydefault.com/berichHub).

The chatbot utilizes a RAG approach to provide current and accurate answers, bypassing the knowledge cutoff date of the Large Language Model (LLM) by incorporating external data.

[![wakatime](https://wakatime.com/badge/user/c4621892-41e0-4c29-a8bc-05597d124f63/project/c8cb1243-05eb-4b92-a4df-acc99ebf081d.svg)](https://wakatime.com/badge/user/c4621892-41e0-4c29-a8bc-05597d124f63/project/c8cb1243-05eb-4b92-a4df-acc99ebf081d)
[![wakatime](https://wakatime.com/badge/user/c4621892-41e0-4c29-a8bc-05597d124f63/project/8e45c061-5a4a-4dff-a150-bde63a57252c.svg)](https://wakatime.com/badge/user/c4621892-41e0-4c29-a8bc-05597d124f63/project/8e45c061-5a4a-4dff-a150-bde63a57252c)

## Features

* **RAG Implementation:** Augments an LLM's output by providing extra context from external data alongside user input.
* **Up-to-Date Information:** Scrapes current data from the internet (like Wikipedia and news sites) to provide responses on recent events that an LLM might not know due to its training data cutoff.
* **Vector Embeddings:** Transforms text data into numerical vector representations that capture semantic meaning, allowing similarity search.
* **Adjustable Dimensions:** Embedding dimensions and index dimensions are configurable to suit the specific ollama or other models in use—update manually in configuration based on the chosen model.
* **Vector Database Storage:** Stores the vector embeddings and corresponding text chunks in a dedicated vector database (initially DataStax Astra DB, with future support for local PostgreSQL) for efficient similarity search.
* **Cost-Effective:** Reduces the need to fine-tune or retrain large LLMs on new data, which is computationally and financially expensive.
* **Custom Data Sources:** Designed to work with any data you can obtain, including private data not available on the internet, with future support for PDF ingestion.
* **Interactive UI:** Provides a web interface built with Next.js, Tailwind CSS, and ESLint for code quality, allowing users to ask questions and view responses.
* **Streaming Responses:** The chat interface utilizes streaming for a better user experience as responses are generated.

## Technologies Used

* **Next.js:** React framework for building the frontend and backend API routes.
* **langchain.js:** Framework for developing applications powered by language models, used for loaders and text splitting.
* **Ollama Models:** Local or remote ollama chat and embedding models replace OpenAI; configure model names and endpoints in `.env`.
* **DataStax Astra DB / PostgreSQL:** Default vector store is Astra DB; soon, a local PostgreSQL connector will be available—configure via environment variables.
* **Puppeteer:** Node.js library for web scraping to extract page content.
* **TypeScript & ESLint:** Ensures type safety and code quality throughout the project.
* **Tailwind CSS:** Utility-first CSS framework for styling the UI.
* **dotenv:** Loads environment variables from `.env`.
* **ts-node:** Allows running TypeScript scripts directly for data loading.

## Prerequisites

* **Node.js:** Latest stable version.
* **Ollama Setup:** Install and configure ollama engine or remote endpoint.
* **Astra:** Configure AstraDb remote endpoint.
* **.env Configuration:** See below for required variables.

## Setup and Installation
**The default settings are**:
```bash
  model: ollama gemma3
  embadding: nomic-embed-text
  DB: Astra 2.0.1
  versions:
    langchain: 0.1.36
    puppeteer: 19.11.1
    next.js: 15.3 (or any >14)
    react & reactDOM: 19 (or any >18)
    tailwind: v4 via postCSS (any < 4 => needs config & init)
```

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/ColdByDefault/beRichHub-LLM-Agent
   cd beRichHub-LLM-Agent
   ```
2. **Install Dependencies:**

   ```bash
   npm install
   ```

   Always check versions in `package.json`; the versions provided on GitHub are recommended.
3. **Configure Environment Variables:** Create a `.env` file with:

   ```dotenv
   VECTOR_STORE=astra  # or 'postgres'
   ASTRA_DB_NAMESPACE=<namespace>
   ASTRA_DB_COLLECTION=<collection_name>
   ASTRA_DB_API_ENDPOINT=<endpoint>
   ASTRA_DB_APPLICATION_TOKEN=<token>

   POSTGRES_URL=postgresql://user:pass@localhost:5432/yourdb

   OLLAMA_CHAT_MODEL=<model_name>
   OLLAMA_EMBED_MODEL=<model_name>
   EMBEDDING_DIMENSION=<dimension>

   NEXT_PUBLIC_OLLAMA_API_URL=http://localhost:11434

   PDF_INGESTION_ENABLED=false
   ```
4. **Configure TypeScript & ESLint:** Ensure `tsconfig.json` and `.eslintrc` are set up. A sample ESLint config is provided in the repo.

## Data Loading (Seeding the Database)

The project includes a script (`scripts/loadDb.ts`) to scrape and ingest data.

1. **Prepare Data Sources:** Update the `sources` array for URLs or local PDF files (toggle via `PDF_INGESTION_ENABLED`).
2. **Run the Seed Script:**

   ```bash
   npm run seed
   ```

   This process will:

   * Connect to your vector store (Astra DB or PostgreSQL).
   * Create or update the collection/table with the configured embedding dimension and metric.
   * Scrape web pages or read PDF contents.
   * Split content into chunks.
   * Generate embeddings using the configured ollama model.
   * Insert text chunks and embeddings into the vector store.

## Running the Application

```bash
npm run dev
```

Visit `http://localhost:3000` to interact with the chatbot.

## Project Structure

```
.​
├── app/
│   ├── api/chat/root.ts   # RAG logic using ollama models
│   ├── components/        # React UI components (with Tailwind)
│   └── page.tsx           # Main chat page
├── scripts/
│   └── loadDb.ts          # Data ingestion script (web & PDF)
├── .eslintrc.js           # ESLint configuration
├── .env                   # Environment variables
├── package.json           # Dependency versions (check before updating)
└── tsconfig.json          # TypeScript configuration
```

## Future Enhancements

* **PDF Ingestion:** Enable reading and indexing PDF files directly.
* **PostgreSQL Connector:** Switch vector storage to a local PostgreSQL database instead of Astra DB.
* **Model Auto-Selection:** Dynamically choose embedding dimensions and chat settings based on available ollama models.

## Credits

Built with guidance from various open-source tutorials and the ollama documentation. Tailwind CSS and ESLint ensure a clean, maintainable codebase.
