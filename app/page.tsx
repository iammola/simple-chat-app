"use client";
import { PlusIcon } from "@radix-ui/react-icons";

import {  useAppContext, useAppDispatch } from "@/app/app-provider";

export default function Home() {
  const context = useAppContext()
  const dispatch = useAppDispatch();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2">
      <h3>Hey there!</h3>
      <p>Click the button below to create a new thread</p>
      <button
        type="button"
        onClick={() => dispatch({ type: "ADD_THREAD" })}
        className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 font-medium ${context.activeUser.theme.accentBgColor} ${context.activeUser.theme.accentTextColor}`}
      >
        <PlusIcon />
        Create
      </button>
    </div>
  );
}
