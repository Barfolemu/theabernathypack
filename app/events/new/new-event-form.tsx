"use client";

import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { eventCategoryEnum, eventCategoryLabels } from "@/db/schema";
import { createEventAction, type CreateEventState } from "./actions";

const initialState: CreateEventState = {};

const fieldClassName =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30";

export function NewEventForm() {
  const [state, formAction, pending] = useActionState(createEventAction, initialState);
  const [category, setCategory] = useState<string>(eventCategoryEnum.enumValues[0]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <textarea id="description" name="description" required rows={3} className={fieldClassName} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
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
          <Input id="categorySuggestion" name="categorySuggestion" />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="eventDatetime">Date &amp; time</Label>
        <input
          id="eventDatetime"
          name="eventDatetime"
          type="datetime-local"
          required
          className={fieldClassName}
        />
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <p className="text-sm font-medium">Location (at least one required)</p>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationShortDesc">Short description</Label>
          <Input id="locationShortDesc" name="locationShortDesc" placeholder="Main pavilion" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationMapUrl">Map link</Label>
          <Input id="locationMapUrl" name="locationMapUrl" placeholder="https://maps.example.com/..." />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="locationMeetupDetails">Meetup details</Label>
          <textarea
            id="locationMeetupDetails"
            name="locationMeetupDetails"
            rows={2}
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
        {pending ? "Creating…" : "Create event"}
      </Button>
    </form>
  );
}
