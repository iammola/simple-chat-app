"use client";
import { PlusIcon } from "@radix-ui/react-icons";

import { useAppDispatch } from "@/app/app-provider";

export default function Home() {
  const dispatch = useAppDispatch();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <h3>Hey there!</h3>
      <p>Click the button below to create a new thread</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "ADD_THREAD", threadId: Math.random().toString(36).slice(2) })}
        className="flex items-center justify-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 font-medium text-white"
      >
        <PlusIcon />
        Create
      </button>
    </div>
  );
}
