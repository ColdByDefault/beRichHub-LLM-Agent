// MessageList.tsx
"use client";

import React from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string; // empty string ("") = still “loading”
};

interface MessageListProps {
  messages: Message[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  return (
    <section className="w-full max-w-2xl mx-auto flex flex-col space-y-4 p-2">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${
            msg.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <Card
            className={`max-w-[75%] ${
              msg.role === "user"
                ? "bg-indigo-600 text-white"
                : "bg-zinc-800 text-gray-100"
            }`}
          >
            <CardContent className="p-3">
              <CardTitle className="text-sm font-medium mb-1">
                {msg.role === "user" ? "You" : "Assistant"}
              </CardTitle>

              {/** 
               * If this is an assistant message whose content is still an empty string,
               * render a few Skeleton bars instead of showing text. 
               */}
              {msg.role === "assistant" && msg.content === "" ? (
                <div className="space-y-2">
                  {/* Three skeleton lines of varying width */}
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-5/6 rounded-md" />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-base">{msg.content}</p>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </section>
  );
};
