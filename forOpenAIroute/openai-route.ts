// rename this file to route.ts
// save it in app/api/openai/route.ts

import OpenAI from 'openai';
import { OpenAIStream, StreamingTextREsponse } from 'ai';
import { Collection, DataAPIclient} from '@datastax/astra-db-ts';

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


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new DataAPIclient({ASTRA_DB_API_ENDPOINT});

const db = client.db(ASTRA_DB_API_ENDPOINT, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
    let docContext = "";
    let latestMessage = "";
    try {
        const { messages } = await req.json();
        latestMessage = messages[messages?.length - 1]?.content;

        // Get embedding
        const embedding = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: latestMessage,
            encoding_format: "float"
        });

        try {
            const collection = await db.collection(ASTRA_DB_COLLECTION)
            const cursor = collection.find( null, {
                sort: {
                    $vector: embedding.data[0].embedding,
                },
                limit: 10,
            })

            const results = await cursor.toArray();
            const resultsMap = results?.map(doc => doc.text)
            docContext = JSON.stringify(resultsMap);


        } catch (error) {
            console.error("Error querying Astra DB Vectors:", error);
            return new Response("Internal Server Error", { status: 500 });
        }
    } catch (error) {
        console.error("Error in POST handler:", error);
        return new Response("Internal Server Error", { status: 500 });
    }

    const template = {
        role: "system",
        content: `You are a helpful assistant. Use the following context to answer the user's question
        If the context doesn't include the information you need, answer based on your knowledge and don't mention the source of your information.
        -------------
        START CONTEXT
        ${docContext}
        END CONTEXT
        -------------
        QUESTION: ${latestMessage}`,
    }

    const { messages } = await req.json();

    const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [template, ...messages],
        stream: true,
    })

    const stream = OpenAIStream(response)
    return new StreamingTextREsponse(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    })
}