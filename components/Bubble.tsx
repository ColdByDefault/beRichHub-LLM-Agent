// Chat Bubble Component
import React from 'react'
import { cn } from "@/lib/utils"

interface Message {
  role: "user" | "assistant" | "ai"
  content: string
  id?: string
}

interface BubbleProps {
  message: Message
  className?: string
}

const Bubble = ({ message }) => {
  const { content, role } = message
  return (
    <div className={cn(
      "max-w-[80%] px-4 py-2 rounded-2xl text-sm leading-relaxed",
      "shadow-sm border transition-all duration-200",
      role === "user"
        ? "bg-blue-900 text-zinc-50 border-zinc-800 rounded-br-md"
        : "bg-zinc-100 text-zinc-900 border-zinc-200 rounded-bl-md",
      "dark:shadow-lg",
    )}>
      <p className="whitespace-pre-wrap break-words">{content}</p>
    </div>
  )
}

export default Bubble