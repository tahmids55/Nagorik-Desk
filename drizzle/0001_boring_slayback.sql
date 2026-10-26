ALTER TABLE "nagorik_pg"."media" ALTER COLUMN "data" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."media" ALTER COLUMN "thumb" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."media" ADD COLUMN "url" text;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."media" ADD COLUMN "thumb_url" text;--> statement-breakpoint
ALTER TABLE "nagorik_pg"."media" ADD COLUMN "provider_file_id" text;