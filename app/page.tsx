"use client";
import React, { useState, FormEvent } from "react";
import Image from "next/image";
import berich from "@/public/logoWhite.png";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [disabled, setDisabled] = useState(false);

  const onInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setDisabled(true);

    // POST to your SSE handler
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

    // Stream the response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, assistantMsg]);

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      chunk
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .forEach((line) => {
          const payload = line.replace(/^data: /, "").trim();
          if (payload === "[DONE]") return;
          try {
            const { content } = JSON.parse(payload);
            // append to the current assistant message
            assistantMsg = {
              ...assistantMsg,
              content: assistantMsg.content + content,
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? assistantMsg : m
              )
            );
          } catch {
            // ignore non-JSON
          }
        });
    }

    setDisabled(false);
  };

  return (
    <main className="grid grid-rows-[auto_1fr_auto] min-h-screen p-8 gap-8 sm:p-20">
      <header className="flex flex-col items-center text-center">
        <Image src={berich} alt="beRichHub Logo" width={200} height={200} />
        <h1 className="text-4xl font-bold mt-4">Welcome to beRichHub-gpt</h1>
        <p className="text-lg mt-2">
          Your AI-powered assistant for all things beRichHub.
        </p>
      </header>

      <section className="overflow-y-auto w-full max-w-2xl mx-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={
              msg.role === "user"
                ? "text-right"
                : "text-left bg-zinc-800 p-4 rounded-lg"
            }
          >
            <span className="block font-semibold">
              {msg.role === "user" ? "You" : "Assistant"}
            </span>
            <p className="whitespace-pre-wrap">{msg.content}</p>
          </div>
        ))}
      </section>

      <footer className="w-full max-w-2xl mx-auto">
        <form
          onSubmit={onSubmit}
          className="flex gap-4 items-start"
        >
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
    </main>
  );
}