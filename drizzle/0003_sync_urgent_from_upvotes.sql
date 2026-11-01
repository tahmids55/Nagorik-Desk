-- Urgency is now derived from community support: 10+ upvotes.
UPDATE "nagorik_pg"."issues" SET "is_urgent" = ("upvotes" >= 10) WHERE "is_urgent" IS DISTINCT FROM ("upvotes" >= 10);
