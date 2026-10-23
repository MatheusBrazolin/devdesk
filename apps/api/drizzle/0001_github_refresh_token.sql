ALTER TABLE "users" ADD COLUMN "access_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "refresh_token_encrypted" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "refresh_token_expires_at" timestamp with time zone;