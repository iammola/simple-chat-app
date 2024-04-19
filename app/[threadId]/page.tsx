"use client";

import { useRouter } from "next/navigation";
import { PaperPlaneIcon } from "@radix-ui/react-icons";
import { Fragment, useCallback, useState } from "react";

import { useAppContext, useAppDispatch, useThreadMessages } from "@/app/app-provider";

interface Theme {
  color: string;
  userBadgePosition: string;
  messageContentPosition: string;
}

const ChatBubble = ({ theme, message }: { theme: Theme; message: string }) => {
  return (
    <div className={`flex items-center ${theme.messageContentPosition}`}>
      <p className={`min-w-0 text-balance break-words rounded-xl p-2 text-sm ${theme.color}`}>{message}</p>
    </div>
  );
};

const ChatWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid w-full grid-cols-[repeat(20,minmax(0,1fr))] grid-rows-1 [&>*]:row-start-1 [&>*]:row-end-2">
      {children}
    </div>
  );
};

export default function ChatPage({ params }: { params: { threadId: string } }) {
  const router = useRouter();
  const context = useAppContext();
  const dispatch = useAppDispatch();
  const thread = useThreadMessages(params.threadId);

  const [messageContent, setMessageContent] = useState("");
  const addMessage = useCallback(
    (ev: React.FormEvent<HTMLFormElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
      ev.preventDefault();

      setMessageContent("");
      dispatch({ type: "ADD_MESSAGE_TO_THREAD", threadId: params.threadId, message: messageContent });
    },
    [messageContent, dispatch, params.threadId],
  );

  if (thread == null) {
    router.replace("/");
    return null;
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
            className={`h-full flex-1 rounded-lg border border-gray-400 px-2 text-sm outline-none ${context.activeUser.theme.accentFocusBorderColor}`}
          />
        )}
      </header>
      <section className="flex w-full flex-1 flex-col items-center justify-end gap-2 overflow-y-auto py-2">
        {thread.messages.map((msg, idx) => {
          // Unknown User, don't render message

          if (!(msg.from in context.userList)) return;

          // Active user side
          const theme = {
            color: "bg-blue-500 text-white",
            userBadgePosition: "col-start-[20] col-end-[21]",
            messageContentPosition: "col-start-[4] col-end-[20] justify-end",
          };

          // Recipient side
          if (msg.from !== context.activeUser.userId) {
            theme.color = "bg-orange-500 text-white";
            theme.userBadgePosition = "col-start-[1] col-end-[2]";
            theme.messageContentPosition = "col-start-[2] col-end-[18] justify-start";
          }

          return (
            <Fragment key={idx}>
              <ChatWrapper>
                <div className={`flex items-center justify-center ${theme.userBadgePosition}`}>
                  <div className={`select-none rounded-full p-2 text-xs uppercase tracking-wide ${theme.color}`}>
                    {context.userList[msg.from].initials}
                  </div>
                </div>
                <ChatBubble message={msg.message} theme={theme} />
              </ChatWrapper>
              {msg.consecutive?.map(({ message }, idx) => (
                <ChatWrapper key={idx}>
                  <ChatBubble message={message} theme={theme} />
                </ChatWrapper>
              ))}
            </Fragment>
          );
        })}
      </section>
      <form className="flex w-full items-center justify-start gap-2 p-2" onSubmit={addMessage}>
        <textarea
          required
          name="messageContent"
          value={messageContent}
          placeholder="Type message here..."
          onChange={(e) => setMessageContent(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            addMessage(e); // trigger event
          }}
          className={`max-h-[7.5rem] min-h-[3rem] flex-1 resize-y rounded-lg border border-gray-400 px-2 py-3 text-sm outline-none ${context.activeUser.theme.accentFocusBorderColor}`}
        />
        <button
          type="submit"
          disabled={messageContent.length < 1}
          className={`flex items-center justify-center gap-2 rounded-md px-3 py-1.5 font-medium disabled:brightness-75 ${context.activeUser.theme.accentTextColor} ${context.activeUser.theme.accentBgColor}`}
        >
          Send <PaperPlaneIcon />
        </button>
      </form>
    </div>
  );
}
