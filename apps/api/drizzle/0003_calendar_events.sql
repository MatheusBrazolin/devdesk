CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'event' NOT NULL,
	"all_day" boolean NOT NULL,
	"date" date,
	"end_date" date,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"link" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_timing_check" CHECK (("calendar_events"."all_day" and "calendar_events"."date" is not null and "calendar_events"."starts_at" is null and "calendar_events"."ends_at" is null)
        or (not "calendar_events"."all_day" and "calendar_events"."starts_at" is not null and "calendar_events"."date" is null and "calendar_events"."end_date" is null))
);
--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_user_date_idx" ON "calendar_events" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "calendar_events_user_starts_idx" ON "calendar_events" USING btree ("user_id","starts_at");