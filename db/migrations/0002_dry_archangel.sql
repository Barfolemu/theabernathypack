CREATE TYPE "public"."login_role" AS ENUM('member', 'admin');--> statement-breakpoint
ALTER TABLE "logins" ADD COLUMN "role" "login_role" DEFAULT 'member' NOT NULL;