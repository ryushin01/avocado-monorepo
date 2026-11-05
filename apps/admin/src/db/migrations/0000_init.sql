CREATE TABLE "cafes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"region" text NOT NULL,
	"address" text,
	"phone" text,
	"opened_at" date NOT NULL,
	"status" text NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" text PRIMARY KEY NOT NULL,
	"bgg_id" integer,
	"name" text NOT NULL,
	"english_name" text,
	"image_url" text,
	"thumbnail_url" text,
	"categories" text[] NOT NULL,
	"min_players" integer NOT NULL,
	"max_players" integer NOT NULL,
	"play_time_min" integer NOT NULL,
	"play_time_max" integer NOT NULL,
	"difficulty" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"cafe_id" text NOT NULL,
	"game_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "inventory_items_cafe_id_game_id_pk" PRIMARY KEY("cafe_id","game_id")
);
--> statement-breakpoint
CREATE TABLE "play_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"cafe_id" text NOT NULL,
	"game_id" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"returned_at" timestamp with time zone,
	"player_count" integer NOT NULL,
	"table_label" text
);
--> statement-breakpoint
CREATE TABLE "reservations" (
	"id" text PRIMARY KEY NOT NULL,
	"cafe_id" text NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"party_size" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"memo" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"arrived_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"cafe_id" text,
	"active" boolean NOT NULL,
	"password_hash" text
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"cafe_id" text NOT NULL,
	"number" integer NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"party_size" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"status" text NOT NULL,
	"called_at" timestamp with time zone,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_sessions" ADD CONSTRAINT "play_sessions_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_cafe_id_cafes_id_fk" FOREIGN KEY ("cafe_id") REFERENCES "public"."cafes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "play_sessions_cafe_started_idx" ON "play_sessions" USING btree ("cafe_id","started_at");--> statement-breakpoint
CREATE INDEX "reservations_cafe_starts_idx" ON "reservations" USING btree ("cafe_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "waitlist_cafe_created_idx" ON "waitlist_entries" USING btree ("cafe_id","created_at");