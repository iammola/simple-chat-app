"use client";

import { createContext, useContext } from "react";

import type { FirebaseApp } from "firebase/app";
import type { Auth as FirebaseAuth } from "firebase/auth";

export interface User {
  userId: string;
  email: string;
  initials: string;
  displayName: string;
  color: string;
}

interface Theme {
  accentBgColor: string;
  accentTextColor: string;
  accentFocusBorderColor: string;
}

export interface Thread {
  id: string;
  title?: string;
  createdAt: number;
  lastUpdated?: number;
  messages: Array<Message & { consecutive?: Omit<Message, "from">[] }>;
}

interface Message {
  from: string;
  message: string;
}

export interface AppContextType {
  activeUser: User | null;
  threads: Record<string, Thread>;
  userList: Record<string, User>;
}

export type AppDispatchContext =
  | { type: "ADD_THREAD"; threadId: string }
  | { type: "ADD_MESSAGE_TO_THREAD"; threadId: string; message: string }
  | { type: "SET_THREAD_TITLE"; threadId: string; title: string }
  | { type: "LOG_OUT" }
  | { type: "LOG_IN"; isNew: boolean; user: Omit<User, "initials"> }
  | { type: "SET_THREADS"; threads: Record<string, Thread> }
  | { type: "ADD_USERS"; users: Record<string, User> };

export const AppContext = createContext<AppContextType>(null as never);
export const AppDispatchContext = createContext<React.Dispatch<AppDispatchContext>>(null as never);
export const FirebaseContext = createContext<{ app: FirebaseApp; auth: FirebaseAuth }>(null as never);

export function useAppDispatch() {
  return useContext(AppDispatchContext);
}

export function useAppContext() {
  return useContext(AppContext);
}

export function useFirebase() {
  return useContext(FirebaseContext);
}

export function useThreadMessages(threadId: string) {
  const context = useAppContext();
  return context.threads[threadId] as Thread | undefined;
}
