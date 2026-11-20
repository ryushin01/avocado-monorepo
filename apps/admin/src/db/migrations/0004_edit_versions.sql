CREATE SEQUENCE "public"."row_version" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1;--> statement-breakpoint
ALTER TABLE "cafes" ADD COLUMN "version" integer DEFAULT nextval('row_version') NOT NULL;--> statement-breakpoint
ALTER TABLE "games" ADD COLUMN "version" integer DEFAULT nextval('row_version') NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "version" integer DEFAULT nextval('row_version') NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "version" integer DEFAULT nextval('row_version') NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "version" integer DEFAULT nextval('row_version') NOT NULL;