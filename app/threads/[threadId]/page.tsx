"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PaperPlaneIcon } from "@radix-ui/react-icons";

import { useAppContext, useAppDispatch, useThreadMessages } from "@/app/app-provider";

export default function ChatPage({ params }: { params: { threadId: string } }) {
  const [mounted, setMounted] = useState(false);

  const router = useRouter();
  const context = useAppContext();
  const dispatch = useAppDispatch();
  const thread = useThreadMessages(params.threadId);

  const [messageContent, setMessageContent] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context.activeUser == null || thread == null) router.replace("/");
  }, [context.activeUser, router, thread]);

  if (!mounted || context.activeUser == null || thread == null) return null;

  return (
    <div className="flex h-full w-full  flex-col items-center justify-start divide-y">
      <header className="flex h-12 w-full items-center justify-start bg-slate-100 p-2">
        {thread.title ?? (
          <input
            type="text"
            placeholder="Thread title... Press Enter to Save"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              dispatch({
                type: "SET_THREAD_TITLE",
                title: (e.target as HTMLInputElement).value,
                threadId: params.threadId,
              });
            }}
            className="h-full flex-1 rounded-lg border border-gray-400 px-2 text-sm outline-none focus:border-blue-400"
          />
        )}
      </header>
      <section className="w-full flex-1 space-y-4 overflow-y-auto p-2">
        {thread.messages.map((msg, idx) => {
          // Unknown User, don't render message

          if (!(msg.from in context.userList)) return;

          const theme =
            msg.from === context.activeUser?.userId
              ? // Active user side
                { side: "items-end ml-auto", color: "bg-slate-500" }
              : // Recipient side
                { side: "items-start", color: context.userList[msg.from].color };

          return (
            <div
              key={idx}
              className={`flex w-full max-w-[calc(100%-10rem)] flex-col justify-center gap-0.5 ${theme.side}`}
            >
              <p title={context.userList[msg.from]?.email} className="text-xs text-gray-400">
                {context.userList[msg.from]?.displayName ?? "Unknown"}
              </p>
              <p
                className={`min-w-0 select-none text-balance break-words rounded-xl px-2 py-1 text-sm text-white ${theme.color}`}
              >
                {msg.message}
              </p>
              {msg.consecutive?.map(({ message }, idx) => (
                <p
                  key={idx}
                  className={`min-w-0 select-none text-balance break-words rounded-xl px-2 py-1 text-sm text-white ${theme.color}`}
                >
                  {message}
                </p>
              ))}
            </div>
          );
        })}
      </section>
      <form
        className="flex w-full items-center justify-start gap-2 p-2"
        onSubmit={(e) => {
          e.preventDefault();

          if (messageContent.trim().length < 1) return;
          setMessageContent("");
          dispatch({ type: "ADD_MESSAGE_TO_THREAD", threadId: params.threadId, message: messageContent.trim() });
        }}
      >
        <textarea
          required
          name="messageContent"
          value={messageContent}
          placeholder="Type message here..."
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            (e.target as HTMLTextAreaElement).form?.requestSubmit();
          }}
          className="max-h-[7.5rem] min-h-[3rem] flex-1 resize-y rounded-lg border border-gray-400 px-2 py-3 text-sm outline-none focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={messageContent.trim().length < 1}
          className="flex items-center justify-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 font-medium text-white disabled:brightness-75"
        >
          Send <PaperPlaneIcon />
        </button>
      </form>
    </div>
  );
}
