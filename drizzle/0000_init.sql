CREATE SCHEMA IF NOT EXISTS "nagorik_pg";
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."areas" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"parent_id" text,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	CONSTRAINT "areas_kind_chk" CHECK ("nagorik_pg"."areas"."kind" in ('upazila','union'))
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."categories" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text NOT NULL,
	"icon" text NOT NULL,
	"sort" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comments_len" CHECK (char_length("nagorik_pg"."comments"."body") between 1 and 500)
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "flags_target_chk" CHECK ("nagorik_pg"."flags"."target_type" in ('issue','comment')),
	CONSTRAINT "flags_status_chk" CHECK ("nagorik_pg"."flags"."status" in ('open','dismissed','actioned'))
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."issue_media" (
	"issue_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"position" smallint DEFAULT 0 NOT NULL,
	CONSTRAINT "issue_media_issue_id_media_id_pk" PRIMARY KEY("issue_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."issue_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"actor_role" text NOT NULL,
	"actor_label" text NOT NULL,
	"kind" text NOT NULL,
	"from_status" text,
	"to_status" text,
	"body" text,
	"stakeholder_id" uuid,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" bigserial NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category_id" text NOT NULL,
	"upazila_id" text NOT NULL,
	"union_id" text,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"precise" boolean DEFAULT false NOT NULL,
	"landmark" text,
	"is_urgent" boolean DEFAULT false NOT NULL,
	"anonymous" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"status_note" text,
	"stakeholder_id" uuid,
	"assigned_at" timestamp with time zone,
	"acknowledged_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"reopen_count" smallint DEFAULT 0 NOT NULL,
	"mp_priority" boolean DEFAULT false NOT NULL,
	"mp_commitment" text,
	"mp_target_date" date,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"downvotes" integer DEFAULT 0 NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"hidden_at" timestamp with time zone,
	"hidden_reason" text,
	"hidden_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "issues_status_chk" CHECK ("nagorik_pg"."issues"."status" in ('open','under_review','assigned','in_progress','resolved','rejected')),
	CONSTRAINT "issues_title_len" CHECK (char_length("nagorik_pg"."issues"."title") between 8 and 100),
	CONSTRAINT "issues_body_len" CHECK (char_length("nagorik_pg"."issues"."body") between 20 and 1500),
	CONSTRAINT "issues_lat_chk" CHECK ("nagorik_pg"."issues"."lat" between -90 and 90),
	CONSTRAINT "issues_lng_chk" CHECK ("nagorik_pg"."issues"."lng" between -180 and 180)
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"thumb" "bytea" NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"bytes" integer NOT NULL,
	"attached_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"issue_id" uuid,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"mfa_verified_at" timestamp with time zone,
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."stakeholders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_en" text NOT NULL,
	"name_bn" text,
	"kind" text DEFAULT 'government' NOT NULL,
	"upazila_id" text,
	"phone" text,
	"email" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."update_media" (
	"update_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	CONSTRAINT "update_media_update_id_media_id_pk" PRIMARY KEY("update_id","media_id")
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified_at" timestamp with time zone,
	"phone" text,
	"phone_verified_at" timestamp with time zone,
	"nid_verified_at" timestamp with time zone,
	"nid_hmac" text,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'citizen' NOT NULL,
	"office_title" text,
	"stakeholder_id" uuid,
	"status" text DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"upazila_id" text,
	"union_id" text,
	"bio" text,
	"avatar_media_id" uuid,
	"lang" text DEFAULT 'en' NOT NULL,
	"totp_secret_enc" text,
	"totp_enabled_at" timestamp with time zone,
	"recovery_codes" jsonb,
	"terms_accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_role_chk" CHECK ("nagorik_pg"."users"."role" in ('citizen','authority','office','admin')),
	CONSTRAINT "users_status_chk" CHECK ("nagorik_pg"."users"."status" in ('active','suspended','deleted')),
	CONSTRAINT "users_lang_chk" CHECK ("nagorik_pg"."users"."lang" in ('en','bn')),
	CONSTRAINT "users_authority_stakeholder_chk" CHECK ("nagorik_pg"."users"."role" <> 'authority' or "nagorik_pg"."users"."stakeholder_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"target" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" smallint DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "codes_purpose_chk" CHECK ("nagorik_pg"."verification_codes"."purpose" in ('email_verify','password_reset','phone_verify'))
);
--> statement-breakpoint
CREATE TABLE "nagorik_pg"."votes" (
	"issue_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_issue_id_user_id_pk" PRIMARY KEY("issue_id","user_id"),
	CONSTRAINT "votes_value_chk" CHECK ("nagorik_pg"."votes"."value" in (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "nagorik_pg"."comments" ADD CONSTRAINT "comments_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "nagorik_pg"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."flags" ADD CONSTRAINT "flags_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."flags" ADD CONSTRAINT "flags_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "nagorik_pg"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issue_media" ADD CONSTRAINT "issue_media_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "nagorik_pg"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issue_media" ADD CONSTRAINT "issue_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "nagorik_pg"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issue_updates" ADD CONSTRAINT "issue_updates_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "nagorik_pg"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issue_updates" ADD CONSTRAINT "issue_updates_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issue_updates" ADD CONSTRAINT "issue_updates_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "nagorik_pg"."stakeholders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issues" ADD CONSTRAINT "issues_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issues" ADD CONSTRAINT "issues_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "nagorik_pg"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issues" ADD CONSTRAINT "issues_upazila_id_areas_id_fk" FOREIGN KEY ("upazila_id") REFERENCES "nagorik_pg"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issues" ADD CONSTRAINT "issues_union_id_areas_id_fk" FOREIGN KEY ("union_id") REFERENCES "nagorik_pg"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issues" ADD CONSTRAINT "issues_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "nagorik_pg"."stakeholders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."issues" ADD CONSTRAINT "issues_hidden_by_users_id_fk" FOREIGN KEY ("hidden_by") REFERENCES "nagorik_pg"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."notifications" ADD CONSTRAINT "notifications_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "nagorik_pg"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."stakeholders" ADD CONSTRAINT "stakeholders_upazila_id_areas_id_fk" FOREIGN KEY ("upazila_id") REFERENCES "nagorik_pg"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."update_media" ADD CONSTRAINT "update_media_update_id_issue_updates_id_fk" FOREIGN KEY ("update_id") REFERENCES "nagorik_pg"."issue_updates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."update_media" ADD CONSTRAINT "update_media_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "nagorik_pg"."media"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."users" ADD CONSTRAINT "users_stakeholder_id_stakeholders_id_fk" FOREIGN KEY ("stakeholder_id") REFERENCES "nagorik_pg"."stakeholders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."users" ADD CONSTRAINT "users_upazila_id_areas_id_fk" FOREIGN KEY ("upazila_id") REFERENCES "nagorik_pg"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."users" ADD CONSTRAINT "users_union_id_areas_id_fk" FOREIGN KEY ("union_id") REFERENCES "nagorik_pg"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."verification_codes" ADD CONSTRAINT "verification_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."votes" ADD CONSTRAINT "votes_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "nagorik_pg"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."votes" ADD CONSTRAINT "votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "areas_parent_idx" ON "nagorik_pg"."areas" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "nagorik_pg"."audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_actor_idx" ON "nagorik_pg"."audit_log" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "comments_issue_idx" ON "nagorik_pg"."comments" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "flags_once_uq" ON "nagorik_pg"."flags" USING btree ("target_type","target_id","reporter_id");--> statement-breakpoint
CREATE INDEX "flags_status_idx" ON "nagorik_pg"."flags" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "updates_issue_idx" ON "nagorik_pg"."issue_updates" USING btree ("issue_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "issues_seq_uq" ON "nagorik_pg"."issues" USING btree ("seq");--> statement-breakpoint
CREATE INDEX "issues_feed_idx" ON "nagorik_pg"."issues" USING btree ("hidden_at","created_at");--> statement-breakpoint
CREATE INDEX "issues_score_idx" ON "nagorik_pg"."issues" USING btree ("score");--> statement-breakpoint
CREATE INDEX "issues_status_idx" ON "nagorik_pg"."issues" USING btree ("status");--> statement-breakpoint
CREATE INDEX "issues_upazila_idx" ON "nagorik_pg"."issues" USING btree ("upazila_id");--> statement-breakpoint
CREATE INDEX "issues_category_idx" ON "nagorik_pg"."issues" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "issues_stakeholder_idx" ON "nagorik_pg"."issues" USING btree ("stakeholder_id");--> statement-breakpoint
CREATE INDEX "issues_author_idx" ON "nagorik_pg"."issues" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "issues_geo_idx" ON "nagorik_pg"."issues" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX "media_owner_idx" ON "nagorik_pg"."media" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "media_orphan_idx" ON "nagorik_pg"."media" USING btree ("created_at") WHERE "nagorik_pg"."media"."attached_at" is null;--> statement-breakpoint
CREATE INDEX "notif_user_idx" ON "nagorik_pg"."notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notif_unread_idx" ON "nagorik_pg"."notifications" USING btree ("user_id") WHERE "nagorik_pg"."notifications"."read_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "nagorik_pg"."sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "nagorik_pg"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stakeholders_name_upazila_uq" ON "nagorik_pg"."stakeholders" USING btree ("name_en",coalesce("upazila_id", ''));--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "nagorik_pg"."users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "nagorik_pg"."users" USING btree ("phone") WHERE "nagorik_pg"."users"."phone" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_nid_uq" ON "nagorik_pg"."users" USING btree ("nid_hmac") WHERE "nagorik_pg"."users"."nid_hmac" is not null;--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "nagorik_pg"."users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "codes_user_purpose_idx" ON "nagorik_pg"."verification_codes" USING btree ("user_id","purpose");--> statement-breakpoint
CREATE INDEX "votes_user_idx" ON "nagorik_pg"."votes" USING btree ("user_id");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "nagorik_pg"."audit_log_immutable"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "nagorik_pg"."audit_log"
  FOR EACH ROW EXECUTE FUNCTION "nagorik_pg"."audit_log_immutable"();
