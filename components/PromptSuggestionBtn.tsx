import React from 'react'
import { Button } from "@/components/ui/button";


const PromptSuggestionBtn = ({ text, onClick }) => {
  return (
    <Button variant="outline" onClick={onClick}>{text}</Button>
  )
}

export default PromptSuggestionBtn