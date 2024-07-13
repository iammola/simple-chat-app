"use client";
import "./globals.css";

import { getAuth } from "firebase/auth";
import { Inter } from "next/font/google";
import { initializeApp } from "firebase/app";
import { useEffect, useReducer, useState } from "react";
import { collection, doc, getDoc, getDocs, getFirestore, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

import { AppContext, AppDispatchContext, FirebaseContext } from "@/app/app-provider";

import type { AppContextType, Thread, User } from "@/app/app-provider";

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
const usersCollection = collection(firebaseStore, "users");

const snapshotToType = <T extends unknown>(args: Awaited<ReturnType<typeof getDocs>>) =>
  Object.fromEntries(args.docs.map((doc) => [doc.id, doc.data() as T]));

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
      } else if (action.type === "ADD_USERS") {
        return { ...state, userList: { ...state.userList, ...action.users } };
      } else if (action.type === "ADD_THREAD") {
        if (state.activeUser == null || state.threads[action.threadId] != null) return state;

        updateSession(state.activeUser);

        const newThread: Thread = { id: action.threadId, messages: [], createdAt: Date.now() };

        setDoc(doc(threadsCollection, action.threadId), newThread);

        return {
          ...state,
          threads: { ...state.threads, [action.threadId]: newThread },
        };
      } else if (action.type === "ADD_MESSAGE_TO_THREAD") {
        if (state.activeUser == null || action.message.length < 1) return state;

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
        updateDoc(doc(threadsCollection, action.threadId), newThread as never);

        return { ...state, threads: { ...state.threads, [action.threadId]: newThread } };
      } else if (action.type === "SET_THREAD_TITLE") {
        if (state.activeUser == null) return state;

        const thread = state.threads[action.threadId];
        if (thread.title === action.title) return state;

        updateSession(state.activeUser);

        const newThread: Thread = { ...thread, title: action.title, lastUpdated: Date.now() };
        updateDoc(doc(threadsCollection, action.threadId), newThread as never);

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
        if (action.isNew && state.activeUser?.userId !== activeUser.userId) {
          setDoc(doc(usersCollection, activeUser.userId), activeUser);
        }

        return { ...state, activeUser, userList: { ...state.userList, [activeUser.userId]: activeUser } };
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
        return { ...initial, activeUser: parsed.user, userList: { [parsed.user.userId]: parsed.user } };
      } catch (error) {
        return initial;
      }
    },
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context.activeUser == null) return;

    const threadsUnsubscribe = onSnapshot(threadsCollection, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      dispatch({ type: "SET_THREADS", threads: snapshotToType<Thread>(snapshot) });
    });
    const usersUnsubscribe = onSnapshot(usersCollection, (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) return;
      dispatch({ type: "ADD_USERS", users: snapshotToType<User>(snapshot) });
    });

    return () => {
      threadsUnsubscribe();
      usersUnsubscribe();
    };
  }, [context.activeUser]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (context.activeUser == null || initialDataLoad) return;

    (async () => {
      const [threadsSnapshot, usersSnapshot] = await Promise.all([
        getDocs(threadsCollection),
        getDocs(usersCollection),
      ]);

      dispatch({ type: "SET_THREADS", threads: snapshotToType<Thread>(threadsSnapshot) });
      dispatch({ type: "ADD_USERS", users: snapshotToType<User>(usersSnapshot) });
    })();

    setInitialDataLoad(true);
  }, [context.activeUser, initialDataLoad]);

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
