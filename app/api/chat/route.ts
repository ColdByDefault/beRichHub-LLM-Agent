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

// Build Astra client
const client = new DataAPIClient({});
const db = client.db(ASTRA_DB_API_ENDPOINT, {
  token: ASTRA_DB_APPLICATION_TOKEN,
  keyspace: ASTRA_DB_NAMESPACE,
});

// Helper to get embeddings
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

    // 1) Get embedding and query Astra for context
    const vector = await embedText(latestMessage);
    const coll: Collection = await db.collection(ASTRA_DB_COLLECTION);
    const docs = await coll
      .find(null, { sort: { $vector: vector }, limit: 10 })
      .toArray();
    const snippets = docs.map((d) => d.content || d.text || "");
    const context = JSON.stringify(snippets);

    // 2) Build system + user history into a prompt
    const systemMsg = {
      role: "system",
      content: `
You are a helpful assistant. Use the following context to answer the user's question.
If the context doesn't include the information, answer from your own knowledge (no citations) and mention it.

-------------  
START CONTEXT  
${context}  
END CONTEXT  
-------------  
QUESTION: ${latestMessage}
      `.trim(),
    };
    const prompt =
      [systemMsg, ...messages]
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n") + "\nASSISTANT:";

    // 3) Stream generation from Ollama
    const genRes = await fetch(`${OLLAMA_API_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "deepseek-r1:7b-qwen-distill-q4_K_M", prompt, stream: true }),
    });
    if (!genRes.ok || !genRes.body) {
      const errText = await genRes.text();
      console.error("Generation error", genRes.status, errText);
      return new Response("Internal Server Error", { status: 500 });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const uuid = crypto.randomUUID();

    const sseStream = new ReadableStream({
      async start(controller) {
        const reader = genRes.body.getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const text = decoder.decode(value).trim();
          
          let responseChunk = "";
          try {
            // parse Ollama JSON chunk and extract only the `response` field
            const parsed = JSON.parse(text);
            responseChunk = parsed.response ?? "";
          } catch {
            // if it's not valid JSON, skip it
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
    console.error("POST handler failed:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}