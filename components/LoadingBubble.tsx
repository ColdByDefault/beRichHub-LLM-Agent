import React from 'react'
import { Skeleton } from "@/components/ui/skeleton"


const LoadingBubble = () => {
  return (
    <div>
        <Skeleton className="w-[150px] h-[10px] mt-2" />
    </div>
  )
}

export default LoadingBubble