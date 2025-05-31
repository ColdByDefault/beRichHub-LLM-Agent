// Chat.tsx
"use client";

import React, { useState, FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MessageList, Message } from "@/components/MessageList";

export default function Chat() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [disabled, setDisabled] = useState(false);

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // 1) Add the user’s message immediately
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setDisabled(true);

    // 2) Insert an “empty‐content” assistant placeholder (shows the skeleton)
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "" }, // ← content="" triggers skeleton
    ]);

    // 3) Start the SSE/stream to /api/chat
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [...messages, userMsg] }),
    });
    if (!res.ok || !res.body) {
      console.error("Network error");
      setDisabled(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let inThink = false;
    let started = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop()!;

      for (const part of parts) {
        if (!part.startsWith("data: ")) continue;
        const payload = part.replace(/^data: /, "").trim();
        if (payload === "[DONE]") break;

        try {
          const { content } = JSON.parse(payload);
          // Strip out any <think>…</think> spans
          let clean = "";
          let idx = 0;
          while (idx < content.length) {
            if (!inThink && content.startsWith("<think>", idx)) {
              inThink = true;
              idx += 7;
            } else if (inThink && content.startsWith("</think>", idx)) {
              inThink = false;
              idx += 8;
            } else if (!inThink) {
              clean += content[idx++];
            } else {
              idx++;
            }
          }

          if (clean) {
            // 4) As soon as we get real tokens (clean), overwrite the assistant’s "" with real text
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: started ? m.content + clean : clean,
                    }
                  : m
              )
            );
            started = true;
          }
        } catch {
          // ignore parse errors
        }
      }
    }

    setDisabled(false);
  };

  return (
    <section className="flex flex-col justify-between h-full p-4">
      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} />
      </div>

      {/* Input form “pinned” to bottom */}
      <footer className="w-full max-w-2xl mx-auto">
        <form onSubmit={onSubmit} className="flex gap-4 items-start">
          <Textarea
            placeholder="Ask me something…"
            value={input}
            onChange={onInputChange}
            disabled={disabled}
            className="flex-1 whitespace-pre-wrap break-words"
          />
          <Button type="submit" variant="outline" disabled={disabled}>
            Submit
          </Button>
        </form>
      </footer>
    </section>
  );
}
