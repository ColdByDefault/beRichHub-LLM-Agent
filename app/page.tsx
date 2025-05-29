'use client';
import Image from "next/image";
import berich from "@/public/logoWhite.png";
import { useChat } from "ai/react"
import { Message } from "ai/react";
import PromptSuggestionsRow from "@/components/PromptSuggestionsRow";
import LoadingBubble from "@/components/LoadingBubble";
import Bubble from "@/components/Bubble";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";




export default function Home() {

  const { input, append, isLoading,  handleInputChange, handleSubmit, messages } = useChat()

  const noMessages = !messages || messages.length === 0;

  const handlePrompt = (prompt: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    }
    append(newMessage);
  }

  return (
    <main className="grid grid-row items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <div className="flex flex-col items-center justify-center text-center">
        <Image src={berich} alt="beRichHub Logo" width={200} height={200} />
        <h1 className="text-4xl font-bold mt-4">Welcome to beRichHub-gpt</h1>
        <p className="text-lg mt-2">Your AI-powered assistant for all things beRichHub.</p>
      </div>
      <div className="max-w-2xl mx-auto p-4">
        {noMessages ? (
          <>
            <p> Lorem ipsum dolor sit amet consectetur adipisicing elit. Deserunt nostrum sit tempore 
              quos id accusantium velit cum quia est architecto nobis harum possimus, 
              qui delectus, sapiente vero at facere reprehenderit.
            </p>
            <br /> 
            <PromptSuggestionsRow onPromptClick={handlePrompt}/>
          </>
        ) : (
          <>
            {messages.map((message, index) => (
              <Bubble
                key={`message-${index}`}
                message={message}
              />
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-center gap-4 w-full max-w-2xl">
        <Input type="text" onChange={handleInputChange} value={input} placeholder="Ask me something..."/>
        <Button variant="outline">Submit</Button>
      </form>
    </main>
  );
}
