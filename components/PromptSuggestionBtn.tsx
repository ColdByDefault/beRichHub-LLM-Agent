import React from 'react'
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";



const PromptSuggestionBtn = ({ text, onClick }) => {
  return (
      <Button onClick={onClick}
      className="cursor-pointer bg-zinc-900 text-zinc-50 
      hover:bg-zinc-600 transition-colors duration-200"
      >{text}</Button>
  )
}

export default PromptSuggestionBtn