import { DataAPIClient, Collection } from "@datastax/astra-db-ts";
import "dotenv/config";

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
  console.error("Missing env vars");
  process.exit(1);
}

// 1) Build Astra client exactly as in your loadDb.ts
const client = new DataAPIClient({});  
const db = client.db(ASTRA_DB_API_ENDPOINT, {
  token: ASTRA_DB_APPLICATION_TOKEN,
  keyspace: ASTRA_DB_NAMESPACE,
});

// 2) Helper to call your local Ollama embed endpoint
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
    console.error("Embedding error", res.status, json);
    throw new Error("Failed to get valid embedding from Ollama");
  }
  return json.embedding;
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages.length - 1]?.content || "";

    // 3) Get the embedding from Ollama
    const vector = await embedText(latestMessage);

    // 4) Query Astra DB nearest-neighbor by that vector
    const coll: Collection = await db.collection(ASTRA_DB_COLLECTION);
    const cursor = coll.find(null, {
      sort: { $vector: vector },
      limit: 10,
    });
    const docs = await cursor.toArray();
    const snippets = docs.map((d) => d.content || d.text || "");
    const docContext = JSON.stringify(snippets);

    // 5) Build a “system” message with context
    const systemMsg = {
      role: "system",
      content: `
You are a helpful assistant. Use the following context to answer the user's question.
If the context doesn't include the information, answer from your own knowledge (no citations).

-------------  
START CONTEXT  
${docContext}  
END CONTEXT  
-------------  
QUESTION: ${latestMessage}
      `.trim(),
    };

    // 6) Flatten history into one prompt string
    const history = [systemMsg, ...messages];
    const prompt = history
      .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
      .join("\n") + "\nASSISTANT:";

    // 7) Call Ollama generate with streaming
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
      console.error("Generation error", genRes.status, errText);
      return new Response("Internal Server Error", { status: 500 });
    }

    // 8) Pipe the Ollama stream back as SSE
    return new Response(genRes.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("POST handler failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
