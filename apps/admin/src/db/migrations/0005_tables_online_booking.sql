CREATE TABLE "cafe_tables" (
	"id" text PRIMARY KEY NOT NULL,
	"cafe_id" text NOT NULL,
	"label" text NOT NULL,
	"seats" integer NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "table_id" text;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "source" text DEFAULT 'staff' NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_tables" ADD CONSTRAINT "cafe_tables_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cafe_tables_cafe_label_idx" ON "cafe_tables" USING btree ("cafe_id","label");--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_table_id_cafe_tables_id_fk" FOREIGN KEY ("table_id") REFERENCES "public"."cafe_tables"("id") ON DELETE no action ON UPDATE no action;