"use client";
import Chat from "@/components/Chat";



export default function Home() {
  return (
    <main className="grid min-h-screen p-8 gap-8 sm:p-20 border">
      <header className="flex flex-col items-center text-center">
        <h1 className="text-4xl font-bold mt-4">Welcome</h1>
        <p className="text-lg mt-2">
          Your AI-powered assistant for your RAG.
        </p>
      </header>
      <section>
        <Chat />
      </section>
    </main>
  );
}
