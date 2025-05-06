"use client";
import { faker } from "@faker-js/faker";
import { Fragment, useState } from "react";
import { FirebaseError } from "firebase/app";
import * as Tabs from "@radix-ui/react-tabs";
import * as Dialog from "@radix-ui/react-dialog";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { ArrowRightIcon, CheckIcon, ComponentPlaceholderIcon, Cross1Icon, UpdateIcon } from "@radix-ui/react-icons";

import { useAppDispatch, useFirebase } from "@/app/app-provider";

export default function Account({ children }: { children: React.ReactNode }) {
  const tabs = [
    { title: "Log In", id: "logIn", content: <Form action="LOG_IN" /> },
    { title: "Sign Up", id: "signUp", content: <Form action="SIGN_UP" /> },
  ];

  return (
    <Dialog.Root>
      {children}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed inset-0 grid h-screen w-screen place-items-center">
          <Tabs.Root
            defaultValue={tabs[tabs.length - 1].id}
            className="w-full max-w-md divide-y overflow-hidden rounded-lg bg-white"
          >
            <Tabs.List className="flex divide-x">
              {tabs.map(({ title, id }) => (
                <Tabs.Trigger
                  key={id}
                  value={id}
                  className="flex flex-1 items-center justify-center bg-white px-2 py-3 font-bold data-[state=active]:bg-blue-200/50 data-[state=active]:text-blue-900"
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Form(props: { action: "LOG_IN" | "SIGN_UP" }) {
  const { auth } = useFirebase();
  const dispatch = useAppDispatch();

  const [state, setState] = useState<"IDLE" | "LOADING" | "DONE" | "ERROR" | "UPDATING">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  const [userEmail, setUserEmail] = useState(generateEmail());

  function generateEmail() {
    return faker.internet.email({
      firstName: faker.word.sample(),
      lastName: faker.word.sample(),
      provider: "unbored.io",
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

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
        user: { userId: credentials.user.uid, displayName: displayName ?? "", email },
      });
    } catch (error) {
      console.error(error);
      setState("ERROR");

      if (error instanceof FirebaseError) {
        if (error.code === "auth/invalid-credential") {
          setErrorMessage("Invalid e-mail/password. User not found");
          return;
        }
      }

      setErrorMessage(props.action === "LOG_IN" ? "Could not get account details" : "Could not create your user");
      console.dir(error);
    } finally {
      setTimeout(() => setState("IDLE"), 1e3);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col items-center justify-center gap-y-3.5 p-5">
      <Input type="email" title="E-mail" id="email" readOnly value={userEmail}>
        <div className="absolute inset-y-0 right-0 grid place-items-center p-1">
          <button
            type="button"
            onClick={() => setUserEmail(generateEmail())}
            className="rounded-full p-2 hover:bg-black/20"
          >
            <UpdateIcon />
          </button>
        </div>
      </Input>
      <Input type="password" title="Password" id="password" />
      {props.action === "SIGN_UP" && <Input type="text" title="Display Name" id="displayName" />}
      {errorMessage !== "" && <span className="py-1 text-sm text-red-600">{errorMessage}</span>}
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

function Input({ title, children, ...props }: React.ComponentProps<"input">) {
  return (
    <div key={props.id} className="flex w-full flex-col items-start justify-center gap-1">
      <label htmlFor={props.id} className="text-sm text-gray-500">
        {title}
      </label>
      <div className="relative w-full">
        <input
          required
          {...props}
          name={props.id}
          className="w-full rounded-md border p-2 text-sm read-only:bg-gray-100 "
        />
        {children}
      </div>
    </div>
  );
}
