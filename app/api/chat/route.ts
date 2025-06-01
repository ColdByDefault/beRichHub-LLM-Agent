// app/api/chat/route.ts
import { DataAPIClient, Collection } from "@datastax/astra-db-ts";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const {
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  DATABASE_URL,        // for Prisma
  OLLAMA_API_URL,
  VECTOR_DB,           // "astra" or "postgres"
} = process.env;

if (
  !ASTRA_DB_API_ENDPOINT ||
  !ASTRA_DB_APPLICATION_TOKEN ||
  !ASTRA_DB_NAMESPACE ||
  !ASTRA_DB_COLLECTION ||
  !OLLAMA_API_URL ||
  !VECTOR_DB
) {
  console.error("Missing env vars. Make sure ASTRA_*, DATABASE_URL, OLLAMA_API_URL, VECTOR_DB are set.");
  process.exit(1);
}

// ——————————————————————————————————————————————————————————
// 1) Build Astra client (we’ll use this if VECTOR_DB === "astra")
const astraClient = new DataAPIClient({});
const astraDB = astraClient.db(ASTRA_DB_API_ENDPOINT, {
  token: ASTRA_DB_APPLICATION_TOKEN,
  keyspace: ASTRA_DB_NAMESPACE,
});

// 2) Build Prisma client (we’ll use this if VECTOR_DB === "postgres")
const prisma = new PrismaClient();

/////////////////////////////////////////////////////
// Helper: call Ollama’s embedding endpoint
async function embedText(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_API_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });
  const json = await res.json();
  if (!res.ok || !Array.isArray(json.embedding)) {
    console.error("❌ Embedding error", res.status, json);
    throw new Error("Failed to get valid embedding from Ollama");
  }
  // Ollama returns { embedding: number[] }
  return json.embedding as number[];
}

/////////////////////////////////////////////////////
// Helper #1: Fetch top-K similar chunks from Astra DB
async function fetchAstraContext(
  latestEmbedding: number[],
  topK: number
): Promise<string[]> {
  // 1. Open the collection
  const coll: Collection = await astraDB.collection(ASTRA_DB_COLLECTION);

  // 2. Query with a nearest‐neighbor sort on the vector field
  const docs = await coll
    .find(
      null,
      {
        sort: { $vector: latestEmbedding },
        limit: topK,
      }
    )
    .toArray();

  // 3. Extract the content field (or text field, if your documents use that)
  const snippets = docs.map((d) => d.content || d.text || "").filter((s) => !!s);
  return snippets;
}

/////////////////////////////////////////////////////
// Helper #2: Fetch top-K similar chunks from PostgreSQL via Prisma

// Cosine similarity helper:
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function fetchPostgresContext(
  latestEmbedding: number[],
  topK: number
): Promise<string[]> {
  // 1. Fetch ALL chunks (id, content, embedding).
  //    If your table is massive, you might paginate or do a raw SQL approximation
  //    or switch to pgvector. For now, we’ll load them all.
  const allRows = await prisma.chunk.findMany({
    select: {
      content: true,
      embedding: true,
    },
  });

  // 2. Compute similarity of each row’s embedding vs. the new embedding
  const scored = allRows.map((row) => {
    return {
      content: row.content,
      score: cosineSimilarity(latestEmbedding, row.embedding as number[]),
    };
  });

  // 3. Sort by descending score and slice top K
  scored.sort((a, b) => b.score - a.score);
  const topRows = scored.slice(0, topK).map((r) => r.content);

  return topRows;
}

/////////////////////////////////////////////////////
// 3) Main POST handler
export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content || "";

    // 1) Embed the user’s latest message
    const vector = await embedText(latestMessage);

    // 2) Depending on VECTOR_DB, fetch the top 10 similar chunks
    const TOP_K = 10;
    let snippets: string[];

    if (VECTOR_DB === "astra") {
      snippets = await fetchAstraContext(vector, TOP_K);
    } else if (VECTOR_DB === "postgres") {
      snippets = await fetchPostgresContext(vector, TOP_K);
    } else {
      throw new Error(`Unsupported VECTOR_DB="${VECTOR_DB}". Use "astra" or "postgres".`);
    }

    // 3) Build the assistant’s system prompt including those snippets as “context”
    const context = JSON.stringify(snippets);
    const systemMsg = {
      role: "system",
      content: `
You are a helpful assistant. Use the following context to answer the user's question.
If the context doesn't include the information, if the Answer isn't in the CONTEXT; say:
"I know what the answer is, however, it was provided in the context  .

-------------
START CONTEXT  
${context}  
END CONTEXT  
-------------
QUESTION: ${latestMessage}
      `.trim(),
    };

    // 4) Concatenate system + history into one text prompt
    const prompt =
      [systemMsg, ...messages]
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n") + "\nASSISTANT:";

    // 5) Stream generation from Ollama
    const genRes = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-r1:7b-qwen-distill-q4_K_M",
        prompt,
        stream: true,
      }),
    });
    if (!genRes.ok || !genRes.body) {
      const errText = await genRes.text();
      console.error("❌ Generation error", genRes.status, errText);
      return new Response("Internal Server Error", { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const uuid = crypto.randomUUID();

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = genRes.body!.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value).trim();
          
          let responseChunk = "";
          try {
            // Parse Ollama’s JSON chunk and extract only the `response` field
            const parsed = JSON.parse(text);
            responseChunk = parsed.response ?? "";
          } catch {
            // If it’s not valid JSON, skip it
            continue;
          }

          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                id: uuid,
                role: "assistant",
                content: responseChunk,
              })}\n\n`
            )
          );
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("❌ POST handler failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  } finally {
    // If you used Prisma to query, ensure we disconnect so that local dev servers can shut down cleanly.
    if (VECTOR_DB === "postgres") {
      await prisma.$disconnect();
    }
  }
}
