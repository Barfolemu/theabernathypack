"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMessagesAction, postMessageAction } from "./actions";
import type { EventMessageWithSender } from "@/lib/events";

const POLL_INTERVAL_MS = 4000;

export function Chat({
  eventId,
  initialMessages,
}: {
  eventId: string;
  initialMessages: EventMessageWithSender[];
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      setMessages(await getMessagesAction(eventId));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [eventId]);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await postMessageAction(eventId, {}, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      formRef.current?.reset();
      setMessages(await getMessagesAction(eventId));
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex max-h-80 flex-col gap-2 overflow-y-auto rounded-lg border p-3">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="text-sm">
            <span className="font-medium">{message.senderProfile.displayName}</span>
            <span className="text-muted-foreground"> · {message.createdAt.toLocaleString()}</span>
            <p>{message.body}</p>
          </div>
        ))}
      </div>

      <form ref={formRef} action={handleSubmit} className="flex gap-2">
        <Input name="body" placeholder="Say something…" required className="flex-1" />
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
