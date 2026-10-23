CREATE TABLE "dashboard_snapshots" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"credential" text NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_snapshots" ADD CONSTRAINT "dashboard_snapshots_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;