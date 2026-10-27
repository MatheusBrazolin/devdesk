ALTER TABLE "users" ADD COLUMN "personal_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "personal_token_saved_at" timestamp with time zone;