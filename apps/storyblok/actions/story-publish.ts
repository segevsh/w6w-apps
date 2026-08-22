import type { ActionDefinition } from "@w6w/types";
import { assertCredential, csv, query, spaceIdOf, StoryblokClient } from "../lib/client.ts";

/**
 * `GET /v1/spaces/{id}/stories/{story_id}/publish` — and `.../unpublish`.
 *
 * ## Publishing is a GET, which is worth knowing before something retries it
 *
 * Storyblok's documented endpoint for publishing is a **GET request**. It is a
 * write performed by the verb every client, proxy and retry policy treats as
 * safe to repeat — so a naive "retry all GETs" rule can republish a story that
 * was deliberately unpublished a moment later.
 *
 * Republishing is harmless in itself; the ordering is not.
 *
 * ## Publishing copies the draft over the live version
 *
 * Whatever is in the draft — including changes made by somebody else since a
 * workflow last looked — becomes what the world sees. This action reports
 * whether the story had unpublished changes before it ran, because publishing
 * a story you have not read is publishing somebody else's edit.
 *
 * ## Languages publish separately, when the space allows it
 *
 * With "publish translations individually" enabled, `lang` publishes named
 * language versions and leaves the rest. Without it the parameter is ignored,
 * so a workflow that thinks it published only German has published everything.
 */
const action: ActionDefinition = {
  key: "story-publish",
  type: "perform",
  resource: "story",
  title: "Publish or unpublish a story",
  description:
    "Make a story live, or take it down. Publishing copies the DRAFT over the live version — " +
    "including anybody else's unsaved-to-live edits — so this reports whether the story had " +
    "unpublished changes first. Note Storyblok's publish endpoint is a GET.",
  idempotent: true,
  params: [
    { key: "storyId", label: "Story ID", type: "string", required: true, default: "" },
    {
      key: "published",
      label: "Published",
      type: "boolean",
      default: true,
      hint: "Off unpublishes: the story stays in the editor and leaves the site.",
    },
    {
      key: "languages",
      label: "Languages",
      type: "string",
      default: "",
      placeholder: "de, fr",
      hint: "Only meaningful when the space has 'publish translations individually' enabled — " +
        "otherwise it is IGNORED and everything publishes.",
    },
  ],
  output: [
    { key: "storyId", type: "string", label: "Which story" },
    { key: "slug", type: "string", label: "Its path" },
    { key: "published", type: "boolean", label: "Whether it is live now" },
    { key: "changed", type: "boolean", label: "Whether this changed anything" },
    { key: "hadUnpublishedChanges", type: "boolean", label: "Whether a draft edit went live too" },
    { key: "languages", type: "array", label: "Which languages were named" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const storyId = String(p.storyId ?? "").trim();
    if (!storyId) throw new Error("`storyId` is required");
    const publish = p.published !== false;
    const languages = csv(p.languages) ?? [];

    const client = new StoryblokClient(ctx);
    const base = `/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}`;
    const before = await client.management<{
      story?: {
        full_slug?: string;
        published?: boolean;
        unpublished_changes?: boolean;
      };
    }>(base);
    const existing = before?.story;
    if (!existing) throw new Error(`no story with id ${storyId}`);

    const hadUnpublishedChanges = existing.unpublished_changes === true;
    if (publish && hadUnpublishedChanges) {
      ctx.log(
        "info",
        "this story had unpublished changes, so publishing puts somebody's draft edits live " +
          "along with whatever this workflow intended",
        { storyId },
      );
    }
    if (languages.length) {
      ctx.log(
        "info",
        "language-specific publishing only applies when the space has 'publish translations " +
          "individually' enabled — otherwise Storyblok ignores it and publishes everything",
        { storyId, languages },
      );
    }

    // Storyblok publishes with a GET, which is unusual enough to name.
    await client.management(`${base}/${publish ? "publish" : "unpublish"}`, {
      query: query({ lang: languages.join(",") }),
    });

    return {
      storyId,
      slug: existing.full_slug,
      published: publish,
      changed: existing.published !== publish || hadUnpublishedChanges,
      hadUnpublishedChanges,
      languages,
    };
  },
};

export default action;
