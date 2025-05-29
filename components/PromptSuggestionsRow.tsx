import React from 'react'
import PromptSuggestionBtn from "@/components/PromptSuggestionBtn";

const PromptSuggestionsRow = ({ onPromptClick}) => {
  const suggestions = [
    "What is beRichHub?",
    "How can I use beRichHub?",
    "What are the benefits of using beRichHub-gpt?",
    "Tell me about the latest updates on beRichHub.",
    "How do I get started with beRichHub?",
  ];
  return (
    <div>
      {suggestions.map((suggestion, index) => <PromptSuggestionBtn 
      key={`suggestion-${index}`} 
      text={suggestion}
      onClick={() => onPromptClick(suggestion)}/>)}
    </div>
  )
}

export default PromptSuggestionsRow