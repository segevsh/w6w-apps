import type { ActionDefinition } from "@w6w/types";
import { assertCredential, spaceIdOf, StoryblokClient } from "../lib/client.ts";

/**
 * `PUT /v1/spaces/{id}/stories/{story_id}` with a new `parent_id` — move a
 * story into a folder.
 *
 * ## Moving a story changes its URL
 *
 * The full slug is the folder path plus the story's own slug, so moving
 * `about` into `company/` makes it `company/about`. The old URL stops working
 * and **Storyblok leaves no redirect** — every existing link, every search
 * engine result, every bookmark points at a 404 until somebody adds one at the
 * edge.
 *
 * That is the whole reason this is its own action rather than a parameter on
 * `story-update`: it looks like bookkeeping and it is a URL change.
 *
 * ## References survive the move
 *
 * Other stories hold uuids, not slugs, so nothing internal breaks. It is the
 * outside world that notices.
 *
 * ## A published story moves live
 *
 * The move applies to the published version immediately, without a publish
 * step — so a published page changes address the moment this runs.
 */
const action: ActionDefinition = {
  key: "story-move",
  type: "perform",
  resource: "story",
  title: "Move a story to another folder",
  description:
    "Move a story between folders, which CHANGES ITS URL — the full slug is the folder path plus " +
    "the story's slug, and Storyblok leaves no redirect behind. A published story changes " +
    "address the moment this runs, with no publish step.",
  idempotent: true,
  params: [
    { key: "storyId", label: "Story ID", type: "string", required: true, default: "" },
    {
      key: "parentId",
      label: "Destination folder ID",
      type: "string",
      default: "",
      hint: "Empty moves the story to the root of the space.",
    },
  ],
  output: [
    { key: "storyId", type: "string", label: "Which story" },
    { key: "slug", type: "string", label: "Its path now" },
    { key: "previousSlug", type: "string", label: "Its path before — now a 404" },
    { key: "changed", type: "boolean", label: "Whether it actually moved" },
    { key: "wasPublished", type: "boolean", label: "Whether a live URL just changed" },
    { key: "uuid", type: "string", label: "Unchanged — internal references still resolve" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const storyId = String(p.storyId ?? "").trim();
    if (!storyId) throw new Error("`storyId` is required");
    const parentId = String(p.parentId ?? "").trim();

    const client = new StoryblokClient(ctx);
    const base = `/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}`;
    const before = await client.management<{
      story?: {
        full_slug?: string;
        uuid?: string;
        parent_id?: number | null;
        published?: boolean;
      };
    }>(base);
    const existing = before?.story;
    if (!existing) throw new Error(`no story with id ${storyId}`);

    const currentParent = existing.parent_id ?? null;
    const target = parentId ? Number(parentId) : null;
    if (currentParent === target) {
      return {
        storyId,
        slug: existing.full_slug,
        previousSlug: existing.full_slug,
        changed: false,
        wasPublished: existing.published === true,
        uuid: existing.uuid,
      };
    }

    const result = await client.management<{ story?: { full_slug?: string } }>(base, {
      method: "PUT",
      body: { story: { parent_id: target } },
    });

    ctx.log(
      "warn",
      "moving a story changes its URL and Storyblok leaves no redirect — every existing link to " +
        "the old path is now a 404" +
        (existing.published ? ", and this story is published, so that is live now" : ""),
      { storyId },
    );

    return {
      storyId,
      slug: result?.story?.full_slug,
      previousSlug: existing.full_slug,
      changed: true,
      wasPublished: existing.published === true,
      // References are by uuid, so nothing internal breaks.
      uuid: existing.uuid,
    };
  },
};

export default action;
