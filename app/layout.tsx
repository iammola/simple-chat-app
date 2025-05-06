"use client";
import "./globals.css";

import { faker } from "@faker-js/faker";
import { getAuth } from "firebase/auth";
import { Inter } from "next/font/google";
import { initializeApp } from "firebase/app";
import { useEffect, useReducer } from "react";
import { collection, doc, getDocs, getFirestore, onSnapshot, setDoc, updateDoc } from "firebase/firestore";

import { AppContext, AppDispatchContext, FirebaseContext } from "@/app/app-provider";

import type { AppContextType, Thread, User } from "@/app/app-provider";

const inter = Inter({ subsets: ["latin"] });

const ACTIVE_USER_KEY = "chat/active-user";
const ANONYMOUS_USER_ID = "chat/anonymous-active-user";

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
  const [context, dispatch] = useReducer(
    (state: AppContextType, action: AppDispatchContext) => {
      const updateSession = (user: NonNullable<AppContextType["activeUser"]> | null) => {
        user != null && localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify({ timestamp: Date.now(), user }));
      };

      const clearSession = () => localStorage.removeItem(ACTIVE_USER_KEY);

      const implicitActiveUser = state.activeUser?.userId ?? localStorage.getItem(ANONYMOUS_USER_ID);
      if (implicitActiveUser == null) return state;

      if (action.type === "SET_STATE") {
        return { ...state, state: action.state };
      } else if (action.type === "SET_THREADS") {
        return { ...state, threads: action.threads };
      } else if (action.type === "ADD_USERS") {
        return { ...state, userList: { ...state.userList, ...action.users } };
      } else if (action.type === "ADD_THREAD") {
        if (state.threads[action.threadId] != null) return state;

        updateSession(state.activeUser);

        const newThread: Thread = { id: action.threadId, messages: [], createdAt: Date.now() };

        setDoc(doc(threadsCollection, action.threadId), newThread);

        return {
          ...state,
          threads: { ...state.threads, [action.threadId]: newThread },
        };
      } else if (action.type === "ADD_MESSAGE_TO_THREAD") {
        const message = action.message.trim();
        if (message.length < 1) return state;

        const thread = state.threads[action.threadId];
        let messages = [...thread.messages];

        if (messages.at(-1)?.from === implicitActiveUser) {
          const messagesCount = messages.length - 1;

          messages = messages.map((_, idx) =>
            idx === messagesCount ? { ..._, consecutive: [...(_.consecutive ?? []), { message }] } : _,
          );
        } else messages = [...messages, { from: implicitActiveUser, message }];

        updateSession(state.activeUser);

        const newThread: Thread = { ...thread, messages, lastUpdated: Date.now() };
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
      state: "IDLE",
      activeUser: null,
      userList: {},
      threads: {},
    } satisfies AppContextType,
    (initial) => {
      try {
        const storedUser = localStorage.getItem(ACTIVE_USER_KEY);

        if (storedUser != null) {
          const parsed = JSON.parse(storedUser) as {
            timestamp: number;
            user: NonNullable<AppContextType["activeUser"]>;
          };

          if (parsed.timestamp + 1 * 24 * 60 * 60 * 1e3 < Date.now()) return initial;
          return {
            ...initial,
            activeUser: parsed.user,
            userList: { [parsed.user.userId]: parsed.user },
          };
        }

        // Generate implicit NanoID for anonymous user
        localStorage.setItem(ANONYMOUS_USER_ID, faker.string.nanoid());

        return initial;
      } catch (error) {
        return initial;
      }
    },
  );

  useEffect(() => {
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
    if (context.state !== "IDLE") return;

    (async () => {
      dispatch({ type: "SET_STATE", state: "LOADING" });

      try {
        const [threadsSnapshot, usersSnapshot] = await Promise.all([
          getDocs(threadsCollection),
          getDocs(usersCollection),
        ]);

        dispatch({ type: "SET_THREADS", threads: snapshotToType<Thread>(threadsSnapshot) });
        dispatch({ type: "ADD_USERS", users: snapshotToType<User>(usersSnapshot) });
        dispatch({ type: "SET_STATE", state: "READY" });
      } catch (error) {
        dispatch({ type: "SET_STATE", state: "ERROR" });
      }
    })();
  }, [context.state]);

  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="grid h-full w-full grid-cols-[25%_minmax(0,_1fr)] divide-x">
          <FirebaseContext.Provider value={{ app: firebaseApp, auth: firebaseAuth }}>
            <AppContext.Provider value={context}>
              <AppDispatchContext.Provider value={dispatch}>
                {context.state === "IDLE" ? null : children}
              </AppDispatchContext.Provider>
            </AppContext.Provider>
          </FirebaseContext.Provider>
        </div>
      </body>
    </html>
  );
}
