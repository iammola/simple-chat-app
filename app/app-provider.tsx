"use client";

import { createContext, useContext } from "react";

interface User {
  theme: Theme;
  initials: string;
  displayName: string;
}

interface Theme {
  accentBgColor: string;
  accentTextColor: string;
  accentFocusBorderColor: string
}

interface Thread {
  title?: string;
  createdAt: Date;
  lastUpdated?: Date;
  messages: Array<Message & { consecutive?: Omit<Message, "from">[] }>;
}

interface Message {
  from: string;
  message: string;
}

export interface AppContextType {
  activeUser: { userId: string; theme: Theme };
  threads: Record<string, Thread>;
  userList: Record<string, User>;
}

export type AppDispatchContext =
  | { type: "ADD_THREAD" }
  | { type: "ADD_MESSAGE_TO_THREAD"; threadId: string; message: string }
  | { type: "CHANGE_USER"; userId: string }
  | { type: "SET_THREAD_TITLE"; threadId: string; title: string };

export const AppContext = createContext<AppContextType>(null as never);
export const AppDispatchContext = createContext<React.Dispatch<AppDispatchContext>>(null as never);

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}

export function useAppContext() {
  return useContext(AppContext);
}

export function useThreadMessages(threadId: string) {
  const context = useAppContext();
  return context.threads[threadId] as Thread | undefined;
}
