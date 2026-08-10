"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventCategoryEnum, eventCategoryLabels, type Event } from "@/db/schema";
import { updateEventAction, type EditEventState } from "./actions";

const initialState: EditEventState = {};

const fieldClassName =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

function toLocalDatetimeInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function EditEventForm({ event }: { event: Event }) {
  const boundAction = updateEventAction.bind(null, event.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [category, setCategory] = useState<string>(event.category);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={event.title} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea
          id="description"
          name="description"
          required
          rows={3}
          defaultValue={event.description}
          className={fieldClassName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={fieldClassName}
        >
          {eventCategoryEnum.enumValues.map((value) => (
            <option key={value} value={value}>
              {eventCategoryLabels[value]}
            </option>
          ))}
        </select>
      </div>

      {category === "other" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categorySuggestion">Suggest a category (optional)</Label>
          <Input
            id="categorySuggestion"
            name="categorySuggestion"
            defaultValue={event.categorySuggestion ?? ""}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eventDatetime">Date &amp; time</Label>
        <input
          id="eventDatetime"
          name="eventDatetime"
          type="datetime-local"
          required
          defaultValue={toLocalDatetimeInputValue(event.eventDatetime)}
          className={fieldClassName}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Location (at least one required)</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationShortDesc">Short description</Label>
          <Input
            id="locationShortDesc"
            name="locationShortDesc"
            defaultValue={event.locationShortDesc ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationMapUrl">Map link</Label>
          <Input id="locationMapUrl" name="locationMapUrl" defaultValue={event.locationMapUrl ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationMeetupDetails">Meetup details</Label>
          <textarea
            id="locationMeetupDetails"
            name="locationMeetupDetails"
            rows={2}
            defaultValue={event.locationMeetupDetails ?? ""}
            className={fieldClassName}
          />
        </div>
      </div>

      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
