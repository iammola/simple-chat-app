"use client";
import * as Tabs from "@radix-ui/react-tabs";
import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowRightIcon, CheckIcon, ComponentPlaceholderIcon, Cross1Icon } from "@radix-ui/react-icons";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";

import { useAppContext, useAppDispatch, useFirebase } from "@/app/app-provider";

const userColors = [
  "bg-orange-500",
  "bg-red-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-teal-500",
  "bg-pink-500",
  "bg-sky-500",
];

export default function Home() {
  const context = useAppContext();

  return (
    <div className="col-span-full row-span-full flex h-full w-full flex-col items-center justify-center gap-2">
      <h3 className="text-lg font-bold uppercase">Hey there!</h3>
      {context.activeUser == null ? <LoggedOut /> : <LoggedIn />}
    </div>
  );
}

function LoggedIn() {
  const context = useAppContext();
  const dispatch = useAppDispatch();

  if (context.activeUser == null) return null;

  return (
    <Fragment>
      <p>
        You&lsquo;re currently logged in as{" "}
        <span title={context.activeUser.email} className="underline decoration-dotted underline-offset-2">
          {context.activeUser.displayName}
        </span>
      </p>
      <div className="flex items-center justify-center gap-3">
        <Link
          href="/threads"
          className="flex items-center justify-center gap-2 rounded-md bg-blue-500 px-3 py-1.5 font-medium text-white hover:brightness-95 disabled:brightness-75"
        >
          View Threads
        </Link>
        <button
          type="button"
          onClick={() => dispatch({ type: "LOG_OUT" })}
          className="flex items-center justify-center gap-2 rounded-md border border-blue-500 bg-white px-3 py-1.5 font-medium text-blue-500 hover:brightness-95 disabled:brightness-75"
        >
          Log Out
        </button>
      </div>
    </Fragment>
  );
}

function LoggedOut() {
  const tabs = [
    { title: "Log In", id: "logIn", content: <Form action="LOG_IN" /> },
    { title: "Sign Up", id: "signUp", content: <Form action="SIGN_UP" /> },
  ];

  return (
    <Fragment>
      <p className="max-w-sm text-pretty text-center text-sm">
        You&lsquo;ll need to log in/sign up to your account to access the system
      </p>
      <Tabs.Root defaultValue={tabs[0].id} className="w-full max-w-md divide-y border">
        <Tabs.List className="flex divide-x">
          {tabs.map(({ title, id }) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className="flex flex-1 items-center justify-center bg-white px-2 py-3 data-[state=active]:brightness-95"
            >
              {title}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {tabs.map(({ id, content }) => (
          <Tabs.Content key={id} value={id}>
            {content}
          </Tabs.Content>
        ))}
      </Tabs.Root>
    </Fragment>
  );
}

function Form(props: { action: "LOG_IN" | "SIGN_UP" }) {
  const { auth } = useFirebase();
  const dispatch = useAppDispatch();

  const [state, setState] = useState<"IDLE" | "LOADING" | "DONE" | "ERROR" | "UPDATING">("IDLE");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      const { email, password, ...others } = Object.fromEntries(
        [...(e.target as HTMLFormElement).querySelectorAll("[name]")].map((input) => [
          input.getAttribute("name") ?? "",
          (input as HTMLInputElement).value,
        ]),
      );

      if (!email || !password) return;

      setState("LOADING");
      const credentials = await (props.action === "LOG_IN"
        ? signInWithEmailAndPassword(auth, email, password)
        : createUserWithEmailAndPassword(auth, email, password));

      let { displayName } = credentials.user;

      if (props.action === "SIGN_UP") {
        setState("UPDATING");
        await updateProfile(credentials.user, { displayName: others.displayName });
        displayName = others.displayName;
      }

      setState("DONE");
      dispatch({
        type: "LOG_IN",
        isNew: props.action === "SIGN_UP",
        user: {
          userId: credentials.user.uid,
          displayName: displayName ?? "",
          email,
          color: userColors[Math.floor(Math.random() * userColors.length)],
        },
      });
    } catch (error) {
      console.error(error);
      setState("ERROR");
    } finally {
      setTimeout(() => setState("IDLE"), 1e3);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center justify-center gap-y-3.5 p-5">
      {[
        { type: "email", title: "E-mail", id: "email" },
        { type: "password", title: "Password", id: "password" },
        { type: "text", title: "Display Name", id: "displayName", hide: props.action === "LOG_IN" },
      ].map(({ type, title, id, hide }) =>
        hide ? null : (
          <div key={id} className="flex w-full flex-col items-start justify-center gap-1">
            <label htmlFor={id} className="text-sm text-gray-500">
              {title}
            </label>
            <input required type={type} name={id} id={id} className="w-full rounded-md border p-2 text-sm" />
          </div>
        ),
      )}
      <button
        type="submit"
        disabled={state !== "IDLE"}
        className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 font-medium text-white disabled:cursor-not-allowed disabled:brightness-90 ${state === "DONE" ? "bg-green-500" : state === "ERROR" ? "bg-red-500" : "bg-blue-500"}`}
      >
        {state === "IDLE" ? (
          <Fragment>
            <ArrowRightIcon /> Continue
          </Fragment>
        ) : state === "DONE" ? (
          <Fragment>
            <CheckIcon />
            Done
          </Fragment>
        ) : state === "ERROR" ? (
          <Fragment>
            <Cross1Icon /> Error
          </Fragment>
        ) : (
          <Fragment>
            <ComponentPlaceholderIcon className="animate-spin" />
            {state === "LOADING" ? "Loading" : "Updating"}
          </Fragment>
        )}
      </button>
    </form>
  );
}
