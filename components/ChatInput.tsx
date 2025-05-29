"use client";
import React, { ChangeEvent, FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface ChatInputProps {
  input: string;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  disabled?: boolean;
}

export default function ChatInput({
  input,
  onInputChange,
  onSubmit,
  disabled = false,
}: ChatInputProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="flex items-start gap-4 w-full max-w-2xl"
    >
      <Textarea
        placeholder="Ask me something…"
        value={input}
        onChange={onInputChange}
        disabled={disabled}
        className="whitespace-pre-wrap break-words"
      />
      <Button variant="outline" disabled={disabled}>
        Submit
      </Button>
    </form>
  );
}
