// scripts/loadPostgres.ts

import { PrismaClient } from "@prisma/client";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

type SimilarityMetric = "dot_product" | "euclidean" | "cosine";

const {
  DATABASE_URL,           // pulled in by PrismaClient (from prisma/.env)
  OLLAMA_API_URL,         // same as before, for embedding
} = process.env;

if (!DATABASE_URL || !OLLAMA_API_URL) {
  console.error("Missing env vars. Make sure DATABASE_URL and OLLAMA_API_URL are set.");
  process.exit(1);
}

// 1. Instantiate PrismaClient
const prisma = new PrismaClient();

// 2. Reuse your same chunking parameters:
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 128,
});

// 3. List of URLs to scrape. (You can add as many as you like.)
const urls = ["https://www.gfn.de"];

// 4. Scrape each URL, clean HTML, split into chunks:
async function getAllChunks(urls: string[]): Promise<string[]> {
  let allChunks: string[] = [];
  for (const url of urls) {
    console.log("Scraping", url);
    const loader = new PuppeteerWebBaseLoader(url, {
      launchOptions: { headless: "new" },
      gotoOptions: { waitUntil: "domcontentloaded" },
      evaluate: async (page, browser) => {
        const text = await page.evaluate(() => document.body.innerText);
        await browser.close();
        return text;
      },
    });

    const raw = (await loader.scrape()) || "";
    const cleaned = raw.replace(/<[^>]*>?/gm, "");
    console.log("Chunking text for", url);
    const chunks = await splitter.splitText(cleaned);
    allChunks = allChunks.concat(chunks);
  }
  return allChunks;
}

// 5. Call Ollama to embed one chunk at a time:
async function embedChunk(chunk: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_API_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: chunk }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Embedding API error:", res.status, json);
    throw new Error(`Embedding failed: HTTP ${res.status}`);
  }

  if (!Array.isArray(json.embedding)) {
    console.error("Bad embedding payload:", json);
    throw new Error("No `embedding` array in response");
  }
  return json.embedding as number[];
}

async function main() {
  // 6. Get all text chunks from the URLs
  const chunks = await getAllChunks(urls);
  if (chunks.length === 0) {
    console.error("No chunks to process");
    await prisma.$disconnect();
    return;
  }

  // 7. Embed & insert each chunk into PostgreSQL via Prisma
  console.log("Embedding and inserting chunks into Postgres...");
  for (let i = 0; i < chunks.length; i++) {
    const chunkText = chunks[i];
    console.log(`Embedding chunk ${i + 1}/${chunks.length}…`);
    const vector = await embedChunk(chunkText);

    // 8. Insert into Prisma’s Chunk table.
    //    The `embedding` field in Prisma schema is Float[], which
    //    maps to Postgres float8[] under the hood.
    await prisma.chunk.create({
      data: {
        content: chunkText,
        embedding: vector,
      },
    });
    console.log(`✅ Inserted chunk ${i + 1}/${chunks.length}`);
  }

  console.log("All chunks inserted successfully.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Script failed:", err);
  prisma.$disconnect();
  process.exit(1);
});
