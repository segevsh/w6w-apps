import type { ActionDefinition } from "@w6w/types";
import { assertCredential, spaceIdOf, StoryblokClient } from "../lib/client.ts";

/**
 * `DELETE /v1/spaces/{id}/stories/{story_id}` — remove a content entry.
 *
 * ## Unpublishing is almost always what was meant
 *
 * Taking a page off the site and deleting the page are different operations,
 * and only one of them is reversible. `story-publish` with `published: false`
 * removes it from the site and leaves it in the editor; this removes it from
 * both.
 *
 * ## Deleting a folder takes its contents
 *
 * A folder is a story with `is_folder`, and deleting one removes everything
 * inside it. That is a plausible way to delete a hundred pages by asking to
 * delete one, so this action checks whether the target is a folder and refuses
 * without an explicit acknowledgement.
 *
 * ## Anything linking to it keeps the uuid
 *
 * Storyblok stores references as uuids. A deleted story's uuid stays in every
 * story that referenced it, resolving to nothing — which renders as an empty
 * block rather than an error, and is invisible until somebody looks at the
 * page.
 */
const action: ActionDefinition = {
  key: "story-delete",
  type: "perform",
  resource: "story",
  title: "Delete a story",
  description:
    "Remove a content entry from the editor and the site. UNPUBLISHING is the reversible " +
    "alternative and usually what was meant. Deleting a FOLDER takes everything inside it, so " +
    "that needs an explicit acknowledgement.",
  idempotent: false,
  params: [
    { key: "storyId", label: "Story ID", type: "string", required: true, default: "" },
    {
      key: "confirm",
      label: "Confirm",
      type: "boolean",
      default: false,
      required: true,
      hint: "`story-publish` with `published: false` takes a page off the site reversibly.",
    },
    {
      key: "allowFolder",
      label: "Allow deleting a folder and its contents",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "storyId", type: "string", label: "Which story" },
    { key: "slug", type: "string", label: "What it was" },
    { key: "uuid", type: "string", label: "The uuid other stories may still reference" },
    { key: "wasFolder", type: "boolean", label: "Whether its contents went too" },
    { key: "wasPublished", type: "boolean", label: "Whether it was live" },
    { key: "deleted", type: "boolean", label: "Whether it was removed" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const storyId = String(p.storyId ?? "").trim();
    if (!storyId) throw new Error("`storyId` is required");
    if (p.confirm !== true) {
      throw new Error(
        "set `confirm` to delete this story. It leaves the editor as well as the site, and " +
          "`story-publish` with `published: false` is the reversible way to take a page down",
      );
    }

    const client = new StoryblokClient(ctx);
    const base = `/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}`;
    const before = await client.management<{
      story?: {
        full_slug?: string;
        uuid?: string;
        is_folder?: boolean;
        published?: boolean;
      };
    }>(base);
    const existing = before?.story;
    if (!existing) throw new Error(`no story with id ${storyId}`);

    // A folder deletion is a bulk deletion wearing a single-item interface.
    if (existing.is_folder === true && p.allowFolder !== true) {
      throw new Error(
        `story ${storyId} (${existing.full_slug ?? "unnamed"}) is a FOLDER, and deleting it ` +
          "removes every story inside it. Set `allowFolder` if that is intended",
      );
    }

    await client.management(base, { method: "DELETE" });

    ctx.log(
      "warn",
      "deleted a story — its uuid stays in every story that referenced it, resolving to nothing, " +
        "which renders as an empty block rather than an error",
      { storyId },
    );

    return {
      storyId,
      slug: existing.full_slug,
      uuid: existing.uuid,
      wasFolder: existing.is_folder === true,
      wasPublished: existing.published === true,
      deleted: true,
    };
  },
};

export default action;
