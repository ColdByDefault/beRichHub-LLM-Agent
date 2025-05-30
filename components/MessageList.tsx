"use client";

import React from "react";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <section className="overflow-y-auto w-full max-w-2xl mx-auto space-y-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={
            msg.role === "user"
              ? "text-right bg-zinc-700 p-4 rounded-lg"
              : "text-left bg-zinc-900 p-4 rounded-lg"
          }
        >
          <span className="block font-semibold">
            {msg.role === "user" ? "You" : "Assistant"}
          </span>
          <p className="whitespace-pre-wrap">{msg.content}</p>
        </div>
      ))}
    </section>
  );
};
