"use client";
import "./globals.css";

import { getAuth } from "firebase/auth";
import { Inter } from "next/font/google";
import { initializeApp } from "firebase/app";
import { useEffect, useReducer, useState } from "react";
import { collection, doc, getDoc, getFirestore, setDoc, updateDoc } from "firebase/firestore";

import { AppContext, AppDispatchContext, FirebaseContext } from "@/app/app-provider";

import type { AppContextType, Thread } from "@/app/app-provider";

const inter = Inter({ subsets: ["latin"] });

const ACTIVE_USER_KEY = "chat/active-user";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_APP_ID,
};

const firebaseApp = initializeApp(firebaseConfig);
const firebaseStore = getFirestore(firebaseApp);
const firebaseAuth = getAuth(firebaseApp);

const threadsCollection = collection(firebaseStore, "threads");

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [mounted, setMounted] = useState(false);
  const [initialDataLoad, setInitialDataLoad] = useState(false);
  
  const [context, dispatch] = useReducer(
    (state: AppContextType, action: AppDispatchContext) => {
      const updateSession = (user: NonNullable<AppContextType["activeUser"]>) => {
        localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify({ timestamp: Date.now(), user }));
      };

      const clearSession = () => localStorage.removeItem(ACTIVE_USER_KEY);

      if (action.type === "SET_THREADS") {
        return { ...state, threads: action.threads };
      } else if (action.type === "ADD_THREAD") {
        if (state.activeUser == null) return state;

        updateSession(state.activeUser);

        const threadId = Math.random().toString(36).slice(2);
        const newThread: Thread = { id: threadId, messages: [], createdAt: Date.now() };

        setDoc(doc(threadsCollection, threadId), newThread);

        return {
          ...state,
          threads: { ...state.threads, [threadId]: newThread },
        };
      } else if (action.type === "ADD_MESSAGE_TO_THREAD") {
        if (state.activeUser == null) return state;
        if (action.message.length < 0) return state;

        const thread = state.threads[action.threadId];
        let messages = [...thread.messages];

        if (messages.at(-1)?.from === state.activeUser.userId) {
          const messagesCount = messages.length - 1;

          messages = messages.map((_, idx) =>
            idx === messagesCount ? { ..._, consecutive: [...(_.consecutive ?? []), { message: action.message }] } : _,
          );
        } else messages = [...messages, { from: state.activeUser.userId, message: action.message }];

        updateSession(state.activeUser);

        const newThread: Thread = { ...thread, messages: messages, lastUpdated: Date.now() };
        updateDoc(doc(threadsCollection, action.threadId), newThread);

        return { ...state, threads: { ...state.threads, [action.threadId]: newThread } };
      } else if (action.type === "SET_THREAD_TITLE") {
        if (state.activeUser == null) return state;

        const thread = state.threads[action.threadId];
        updateSession(state.activeUser);

        const newThread: Thread = { ...thread, title: action.title, lastUpdated: Date.now() };
        updateDoc(doc(threadsCollection, action.threadId), newThread);

        return { ...state, threads: { ...state.threads, [action.threadId]: newThread } };
      } else if (action.type === "LOG_IN") {
        const activeUser = {
          ...action.user,
          initials: action.user.displayName
            .split(" ")
            .slice(0, 1)
            .map((word) => word[0].toUpperCase())
            .join(""),
        } satisfies NonNullable<AppContextType["activeUser"]>;

        updateSession(activeUser);

        return { ...state, activeUser };
      } else if (action.type === "LOG_OUT") {
        clearSession();

        return { ...state, activeUser: null };
      }

      return state;
    },
    {
      activeUser: null,
      userList: {},
      threads: {},
    } satisfies AppContextType,
    (initial) => {
      try {
        const storedUser = localStorage.getItem(ACTIVE_USER_KEY);
        if (storedUser == null) return initial;

        const parsed = JSON.parse(storedUser) as { timestamp: number; user: NonNullable<AppContextType["activeUser"]> };

        if (parsed.timestamp + 1 * 24 * 60 * 60 * 1e3 < Date.now()) return initial;
        return { ...initial, activeUser: parsed.user };
      } catch (error) {
        return initial;
      }
    },
  );


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialDataLoad) return;

    (async () => {
      const snapshot = await getDoc(doc(threadsCollection));
      if (!snapshot.exists()) return;

      dispatch({ type: "SET_THREADS", threads: snapshot.data() });
      setInitialDataLoad(true);
    })();
  }, [initialDataLoad]);


  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="grid h-full w-full grid-cols-[25%_minmax(0,_1fr)] divide-x">
          <FirebaseContext.Provider value={{ app: firebaseApp, auth: firebaseAuth }}>
            <AppContext.Provider value={context}>
              <AppDispatchContext.Provider value={dispatch}>{mounted ? children : null}</AppDispatchContext.Provider>
            </AppContext.Provider>
          </FirebaseContext.Provider>
        </div>
      </body>
    </html>
  );
}
