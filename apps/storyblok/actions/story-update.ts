import type { ActionDefinition } from "@w6w/types";
import {
  assertCredential,
  compact,
  json,
  spaceIdOf,
  StoryblokClient,
  validateContent,
} from "../lib/client.ts";

/**
 * `PUT /v1/spaces/{id}/stories/{story_id}` — change a story.
 *
 * ## Sending `content` replaces it entirely
 *
 * There is no merge. A payload carrying two fields replaces a twelve-field
 * story with a two-field one, and the ten that went are gone from the draft —
 * recoverable only from the published version, and only if it was published.
 *
 * So this action **reads the story first** and, unless told otherwise, merges
 * the supplied content over what is there. `replaceContent` opts into the raw
 * behaviour for callers who mean it.
 *
 * ## An update touches the draft, not the site
 *
 * Unless `publish` is set. That is the right default — a workflow that edits
 * content should not deploy it — and it means the change is invisible until
 * somebody publishes, which is either the point or a surprise.
 *
 * ## Editing a story somebody else is editing
 *
 * Storyblok has no locking here. Two writes race, and the last one wins with
 * no warning. Reading first narrows the window and does not close it, which is
 * worth knowing before pointing a high-frequency workflow at content people
 * are also editing by hand.
 */
const action: ActionDefinition = {
  key: "story-update",
  type: "perform",
  resource: "story",
  title: "Update a story",
  description:
    "Change a story. Storyblok REPLACES content rather than merging, so this reads first and " +
    "merges by default — a two-field payload would otherwise leave a two-field story. Touches " +
    "the DRAFT unless `publish` is set.",
  idempotent: true,
  params: [
    {
      key: "storyId",
      label: "Story ID",
      type: "string",
      required: true,
      default: "",
      hint: "The numeric id, from `story-search` or `story-get`.",
    },
    {
      key: "content",
      label: "Content",
      type: "json",
      default: "",
      hint: "Merged over the existing content by default. Nested components still need `_uid`.",
    },
    { key: "name", label: "Name", type: "string", default: "" },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      default: "",
      hint: "Changing this changes the URL. Storyblok does not leave a redirect behind.",
    },
    {
      key: "replaceContent",
      label: "Replace content instead of merging",
      type: "boolean",
      default: false,
      hint: "Storyblok's own behaviour: fields absent from the payload are removed.",
    },
    {
      key: "publish",
      label: "Publish after updating",
      type: "boolean",
      default: false,
    },
  ],
  output: [
    { key: "story", type: "object", label: "The updated story" },
    { key: "id", type: "number", label: "Its id" },
    { key: "slug", type: "string", label: "Its path now" },
    { key: "slugChanged", type: "boolean", label: "Whether the URL moved" },
    { key: "merged", type: "boolean", label: "Whether content was merged or replaced" },
    { key: "removedFields", type: "array", label: "Fields a replace dropped" },
    { key: "published", type: "boolean", label: "Whether this published it" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const storyId = String(p.storyId ?? "").trim();
    if (!storyId) throw new Error("`storyId` is required");

    const client = new StoryblokClient(ctx);
    const before = await client.management<{
      story?: {
        name?: string;
        slug?: string;
        full_slug?: string;
        content?: Record<string, unknown>;
      };
    }>(`/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}`);
    const existing = before?.story;
    if (!existing) throw new Error(`no story with id ${storyId}`);

    const supplied = json(p.content, "content") as Record<string, unknown> | undefined;
    const replace = p.replaceContent === true;

    let content: Record<string, unknown> | undefined;
    let removedFields: string[] = [];
    if (supplied) {
      // A replace drops every field the payload does not carry.
      content = replace ? supplied : { ...(existing.content ?? {}), ...supplied };
      if (replace) {
        removedFields = Object.keys(existing.content ?? {}).filter((key) => !(key in supplied));
      }
      const problems = validateContent(content);
      if (problems.length) {
        throw new Error(
          `this content does not satisfy Storyblok's shape rules: ${problems.join("; ")}`,
        );
      }
    }

    const slug = String(p.slug ?? "").trim().replace(/^\/+|\/+$/g, "");
    const slugChanged = Boolean(slug) && slug !== existing.slug;
    if (slugChanged) {
      ctx.log(
        "warn",
        "changing the slug changes the story's URL, and Storyblok does not leave a redirect " +
          "behind — anything linking to the old path breaks",
        { storyId },
      );
    }
    if (removedFields.length) {
      ctx.log("warn", "a content replace removed fields that were there before", {
        storyId,
        removed: removedFields.length,
      });
    }

    const publish = p.publish === true;
    const result = await client.management<{
      story?: { id?: number; full_slug?: string };
    }>(`/spaces/${encodeURIComponent(spaceId)}/stories/${encodeURIComponent(storyId)}`, {
      method: "PUT",
      body: {
        story: compact({
          name: String(p.name ?? "").trim(),
          slug,
          content,
        }),
        publish: publish ? 1 : 0,
      },
    });

    return {
      story: result?.story,
      id: result?.story?.id ?? Number(storyId),
      slug: result?.story?.full_slug ?? existing.full_slug,
      slugChanged,
      merged: Boolean(supplied) && !replace,
      removedFields,
      published: publish,
    };
  },
};

export default action;
