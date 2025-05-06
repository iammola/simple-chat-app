"use client";

import { VList, VListHandle } from "virtua";
import { useEffect, useRef, useState } from "react";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { ExclamationTriangleIcon, PaperPlaneIcon } from "@radix-ui/react-icons";

import Account from "@/app/threads/account";
import { useAppContext, useAppDispatch, useThreadMessages } from "@/app/app-provider";

export default function ChatPage({ params }: { params: { threadId: string } }) {
  const context = useAppContext();
  const dispatch = useAppDispatch();
  const thread = useThreadMessages(params.threadId);

  const virtualListRef = useRef<VListHandle | null>(null);

  const [messageContent, setMessageContent] = useState("");

  useEffect(() => {
    if (thread?.messages.length == null || virtualListRef.current == null) return;

    virtualListRef.current.scrollToIndex(thread.messages.length - 1, {
      align: "end",
    });
  }, [thread?.messages.length]);

  if (thread == null) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2">
        <ExclamationTriangleIcon />
        Thread not Found
      </div>
    );
  }

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
      <VList ref={virtualListRef} className="w-full flex-1 p-2 [&_>_*_>*:first-child]:m-0">
        {thread.messages.map((msg, idx) => {
          const theme =
            msg.from === context.activeUser?.userId
              ? // Active user side
                { side: "items-end ml-auto", color: "bg-blue-500" }
              : // Recipient side
                { side: "items-start", color: "bg-slate-500" };

          return (
            <div
              key={idx}
              className={`mt-3 flex w-full max-w-[calc(100%-10rem)] flex-col justify-center gap-0.5 ${theme.side}`}
            >
              <p title={context.userList[msg.from]?.email} className="text-xs text-gray-400">
                {context.userList[msg.from]?.displayName ?? "Anonymous"}
              </p>
              <p
                className={`min-w-0 select-none text-balance break-words rounded-xl px-2 py-1 text-sm text-white ${theme.color} empty:hidden`}
              >
                {msg.message}
              </p>
              {msg.consecutive?.map(({ message }, idx) => (
                <p
                  key={idx}
                  className={`min-w-0 select-none text-balance break-words rounded-xl px-2 py-1 text-sm text-white ${theme.color} empty:hidden`}
                >
                  {message}
                </p>
              ))}
            </div>
          );
        })}
      </VList>
      <form
        className="grid w-full grid-cols-[minmax(0,1fr)_max-content] items-center gap-2 p-2 [grid-template-areas:'title_title'_'input_button']"
        onSubmit={(e) => {
          e.preventDefault();

          if (messageContent.trim().length < 1) return;
          setMessageContent("");
          dispatch({ type: "ADD_MESSAGE_TO_THREAD", threadId: params.threadId, message: messageContent.trim() });
        }}
      >
        {context.activeUser == null ? (
          <Account>
            <div className="[grid-area:title]">
              <DialogTrigger className="cursor-default select-none text-xs font-medium underline decoration-dotted underline-offset-2">
                Log in/Sign up
              </DialogTrigger>
            </div>
          </Account>
        ) : (
          <div className="flex items-center justify-start gap-2 [grid-area:title]">
            <span
              title={context.activeUser.email}
              className="cursor-default select-none text-sm font-medium underline decoration-dotted underline-offset-2"
            >
              {context.activeUser.displayName}
            </span>
            <button
              type="button"
              onClick={() => dispatch({ type: "LOG_OUT" })}
              className="rounded-sm px-1.5 py-0.5 text-xs tracking-wide hover:bg-gray-200/70"
            >
              (Logout)
            </button>
          </div>
        )}
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
          className="max-h-[7.5rem] min-h-[3rem] flex-1 resize-y rounded-lg border border-gray-400 px-2 py-3 text-sm outline-none [grid-area:input] focus:border-blue-400"
        />
        <button
          type="submit"
          disabled={messageContent.trim().length < 1}
          className="flex items-center justify-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 font-medium text-white [grid-area:button] disabled:brightness-75"
        >
          Send <PaperPlaneIcon />
        </button>
      </form>
    </div>
  );
}
