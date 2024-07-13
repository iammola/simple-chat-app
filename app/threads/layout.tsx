"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { PlusIcon } from "@radix-ui/react-icons";
import { useParams, useRouter } from "next/navigation";

import { useAppContext, useAppDispatch } from "@/app/app-provider";

export default function ThreadsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mounted, setMounted] = useState(false);

  const context = useAppContext();
  const dispatch = useAppDispatch();

  const router = useRouter();
  const params = useParams<{ threadId: string }>();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context.activeUser == null) router.push("/");
  }, [context.activeUser, router]);

  if (!mounted || context.activeUser == null) return null;

  return (
    <Fragment>
      <aside className="flex min-h-0 flex-col divide-y bg-slate-100">
        <div className="flex h-12 flex-wrap items-center justify-start gap-2 p-2">
          <h1 className="font-medium">Chat</h1>
          <div className="flex-1"></div>
          <button
            type="button"
            title="Create a New Thread"
            className="grid aspect-square place-items-center rounded-md bg-blue-500 p-1.5 text-white"
            onClick={() => dispatch({ type: "ADD_THREAD", threadId: Math.random().toString(36).slice(2) })}
          >
            <PlusIcon />
          </button>
        </div>
        <ul className="flex-1 divide-y overflow-y-auto">
          {Object.entries(context.threads).map(([id, thread], idx) => {
            const lastMessages = thread.messages.at(-1);

            const lastMessage = {
              message: (lastMessages?.consecutive?.at(-1) ?? lastMessages)?.message,
              from: lastMessages?.from,
            };

            return (
              <li key={idx}>
                <Link
                  href={`/threads/${id}`}
                  data-selected={id === params.threadId ? true : undefined}
                  className="grid cursor-pointer grid-cols-[minmax(0,1fr)_max-content] grid-rows-[minmax(0,1fr)_max-content] gap-x-1 gap-y-1 px-3 py-2 hover:bg-gray-300 data-[selected]:bg-gray-300"
                >
                  <h4 className="col-span-full row-start-1 row-end-2 text-sm font-medium">
                    {thread.title ?? `Thread #${idx + 1}`}
                  </h4>
                  <p className="truncate text-xs text-gray-400">
                    {lastMessage.from == null
                      ? "No messages"
                      : `${context.userList[lastMessage.from]?.initials ?? "Unknown"}: ${lastMessage.message}`}
                  </p>
                  {thread.lastUpdated != null && (
                    <p className="col-start-2 col-end-3 shrink-0 text-xs text-gray-400">
                      {formatDistanceToNow(thread.lastUpdated, { includeSeconds: true })} ago
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-x-1 p-2">
          <div className="flex flex-col items-start justify-center gap-1">
            <span className="text-sm font-medium tracking-wide text-gray-800">{context.activeUser.displayName}</span>
            <span className="text-xs text-gray-400">{context.activeUser.email}</span>
          </div>
          <button
            type="button"
            title="Create a New Thread"
            onClick={() => dispatch({ type: "LOG_OUT" })}
            className="flex items-center justify-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white disabled:brightness-75"
          >
            Log Out
          </button>
        </div>
      </aside>
      <main className="h-full min-h-0">{children}</main>
    </Fragment>
  );
}
