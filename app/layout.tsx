"use client";
import "./globals.css";

import Link from "next/link";
import Image from "next/image";
import { useReducer } from "react";
import { Inter } from "next/font/google";
import { useParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { PlusIcon } from "@radix-ui/react-icons";

import { AppContext, AppDispatchContext } from "@/app/app-provider";

import type { AppContextType } from "@/app/app-provider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const params = useParams<{ threadId: string }>();
  const [context, dispatch] = useReducer(
    (state: AppContextType, action: AppDispatchContext) => {
      if (action.type == "ADD_THREAD") {
        return {
          ...state,
          threads: {
            ...state.threads,
            [Math.random().toString(36).slice(2)]: { messages: [], createdAt: new Date() },
          },
        };
      } else if (action.type === "ADD_MESSAGE_TO_THREAD") {
        if (action.message.length < 0) return state;

        const thread = state.threads[action.threadId];
        let messages = [...thread.messages];

        if (messages.at(-1)?.from === state.activeUser.userId) {
          const messagesCount = messages.length - 1;

          messages = messages.map((_, idx) =>
            idx === messagesCount ? { ..._, consecutive: [...(_.consecutive ?? []), { message: action.message }] } : _,
          );
        } else messages = [...messages, { from: state.activeUser.userId, message: action.message }];

        return {
          ...state,
          threads: { ...state.threads, [action.threadId]: { ...thread, messages: messages, lastUpdated: new Date() } },
        };
      } else if (action.type === "SET_THREAD_TITLE") {
        const thread = state.threads[action.threadId];

        return {
          ...state,
          threads: { ...state.threads, [action.threadId]: { ...thread, title: action.title } },
        };
      } else if (action.type === "CHANGE_USER") {
        const user = state.userList[action.userId];
        if (user == null) return state;

        return { ...state, activeUser: { userId: action.userId, theme: user.theme } };
      }

      return state;
    },
    {
      activeUser: { userId: "doctor", theme: { accentBgColor: "bg-blue-500", accentTextColor: "text-white",accentFocusBorderColor: "focus:border-blue-400" } },
      userList: {
        doctor: {
          initials: "JE",
          displayName: "Dr. John Evans",
          theme: { accentBgColor: "bg-blue-500", accentTextColor: "text-white", accentFocusBorderColor: "focus:border-blue-400" },
        },
        patient: {
          initials: "AS",
          displayName: "Adam Sumpter",
          theme: { accentBgColor: "bg-orange-500", accentTextColor: "text-white", accentFocusBorderColor: "focus:border-orange-400" },
        },
      },
      threads: {},
    } satisfies AppContextType,
  );

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="grid h-full w-full grid-cols-[25%_minmax(0,_1fr)] divide-x">
          <aside className="flex min-h-0 flex-col divide-y bg-slate-100">
            <div className="flex h-12 flex-wrap items-center justify-start gap-2 p-2">
              <Link href="/">
                <Image src="/favicon.ico" alt="Logo" width={32} height={32} />
              </Link>
              <h1 className="font-medium">Chat</h1>
              <div className="flex-1"></div>
              <button
                type="button"
                title="Create a New Thread"
                onClick={() => dispatch({ type: "ADD_THREAD" })}
                className={`grid aspect-square place-items-center rounded-md p-1.5 ${context.activeUser.theme.accentTextColor} ${context.activeUser.theme.accentBgColor}`}
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
                      href={`/${id}`}
                      data-selected={id === params.threadId ? true : undefined}
                      className="grid cursor-pointer grid-cols-[minmax(0,1fr)_max-content] grid-rows-[minmax(0,1fr)_max-content] gap-x-1 gap-y-1 px-3 py-2 hover:bg-gray-300 data-[selected]:bg-gray-300"
                    >
                      <h4 className="col-span-full row-start-1 row-end-2 text-sm font-medium">
                        {thread.title ?? `Thread ${id}`}
                      </h4>
                      <p className="truncate text-xs text-gray-400">
                        {lastMessage.from == null
                          ? "No messages"
                          : `${context.userList[lastMessage.from].initials}: ${lastMessage.message}`}
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
            <div className="flex flex-col items-start justify-center gap-y-1 p-2">
              <label htmlFor="loggedInAs" className="text-xs text-gray-500">
                Logged in as
              </label>
              <select
                id="loggedInAs"
                value={context.activeUser.userId}
                onChange={(e) => dispatch({ type: "CHANGE_USER", userId: e.target.value })}
                className="w-full cursor-pointer rounded-md bg-transparent px-1 py-2 outline-none hover:bg-slate-300"
              >
                {Object.entries(context.userList).map(([userId, user]) => (
                  <option value={userId} key={userId}>
                    {user.displayName}
                  </option>
                ))}
              </select>
            </div>
          </aside>
          <main>
            <AppContext.Provider value={context}>
              <AppDispatchContext.Provider value={dispatch}>{children}</AppDispatchContext.Provider>
            </AppContext.Provider>
          </main>
        </div>
      </body>
    </html>
  );
}
