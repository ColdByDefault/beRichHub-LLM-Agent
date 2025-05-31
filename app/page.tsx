"use client";
import React, { useState, FormEvent } from "react";
import Image from "next/image";
import berich from "@/public/logoWhite.png";
import Chat from "@/components/Chat";



export default function Home() {
  return (
    <main className="grid min-h-screen p-8 gap-8 sm:p-20 border">
      <header className="flex flex-col items-center text-center">
        <Image src={berich} alt="beRichHub Logo" width={200} height={200} />
        <h1 className="text-4xl font-bold mt-4">Welcome to beRichHub-gpt</h1>
        <p className="text-lg mt-2">
          Your AI-powered assistant for all things beRichHub.
        </p>
      </header>
      <section>
        <Chat />
      </section>
    </main>
  );
}
