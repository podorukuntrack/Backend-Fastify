CREATE TABLE "retention_complaints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"retention_id" uuid NOT NULL,
	"description" text,
	"photo_before_url" text,
	"photo_after_url" text,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "retention_complaints" ADD CONSTRAINT "retention_complaints_retention_id_retentions_id_fk" FOREIGN KEY ("retention_id") REFERENCES "public"."retentions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "retention_complaints_retention_idx" ON "retention_complaints" USING btree ("retention_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");