// scripts/loadDb.ts
import { DataAPIClient } from "@datastax/astra-db-ts";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";

type SimilarityMetric = "dot_product" | "euclidean" | "cosine";

const {
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  OLLAMA_API_URL,
} = process.env;

if (
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !OLLAMA_API_URL
) {
  console.error(
    "Missing env vars"
  );
  process.exit(1);
}
// add your URLs here
const urls = [""]; 

// 1. Build the Astra DB client
const client = new DataAPIClient({});
const db = client.db(ASTRA_DB_API_ENDPOINT, {
  token: ASTRA_DB_APPLICATION_TOKEN,
  keyspace: ASTRA_DB_NAMESPACE,
});

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 128,
});

// Scrape, chunk and return all chunks from a list of URLs
async function getAllChunks(urls: string[]) {
  let all: string[] = [];
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
    console.log("Chunking text");
    all = all.concat(await splitter.splitText(cleaned));
  }
  return all;
}

// Call Ollama to embed a chunk
async function embedChunk(chunk: string) {
  const res = await fetch(`${OLLAMA_API_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "nomic-embed-text", prompt: chunk }),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Embedding API error", res.status, json);
    throw new Error(`Embedding failed: HTTP ${res.status}`);
  }
  // Ollama returns `{ embedding: number[] }`
  if (!Array.isArray(json.embedding)) {
    console.error("Bad embedding payload", json);
    throw new Error("No `embedding` array in response");
  }
  return json.embedding as number[];
}

async function main() {
  const chunks = await getAllChunks(urls);
  if (chunks.length === 0) {
    console.error("No chunks to process");
    return;
  }

  // 2. Get the first embedding to discover dimension
  console.log("Determining embedding dimension from first chunk…");
  const firstVector = await embedChunk(chunks[0]);
  const dimension = firstVector.length;
  console.log(`Embedding dimension is ${dimension}`);

  // 3. Create the collection with that dimension
  console.log(
    `Creating collection "${ASTRA_DB_COLLECTION}" (dim=${dimension}, metric=cosine)…`
  );
  await db.createCollection(ASTRA_DB_COLLECTION, {
    vector: { dimension, metric: "cosine" },
  });
  console.log("Collection created");

  const coll = await db.collection(ASTRA_DB_COLLECTION);

  // 4. Insert the first chunk we already embedded
  await coll.insertOne({ $vector: firstVector, content: chunks[0] });
  console.log("Inserted chunk 1/" + chunks.length);

  // 5. Now embed & insert the rest
  for (let i = 1; i < chunks.length; i++) {
    const v = await embedChunk(chunks[i]);
    console.log("Created vector:", v);
    await coll.insertOne({ $vector: v, content: chunks[i] });
    console.log(`🔹 Inserted chunk ${i + 1}/${chunks.length}`);
  }

  console.log("All done!");
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
