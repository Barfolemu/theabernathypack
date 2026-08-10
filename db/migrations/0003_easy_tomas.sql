ALTER TABLE "event_rsvps" DROP CONSTRAINT "event_rsvps_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "event_rsvps" ADD CONSTRAINT "event_rsvps_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;