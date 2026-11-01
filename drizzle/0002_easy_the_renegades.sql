CREATE TABLE "nagorik_pg"."bookmarks" (
	"user_id" uuid NOT NULL,
	"issue_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookmarks_user_id_issue_id_pk" PRIMARY KEY("user_id","issue_id")
);
--> statement-breakpoint
ALTER TABLE "nagorik_pg"."bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "nagorik_pg"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."bookmarks" ADD CONSTRAINT "bookmarks_issue_id_issues_id_fk" FOREIGN KEY ("issue_id") REFERENCES "nagorik_pg"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "bookmarks_user_created_idx" ON "nagorik_pg"."bookmarks" USING btree ("user_id","created_at");