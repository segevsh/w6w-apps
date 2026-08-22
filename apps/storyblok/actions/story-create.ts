import type { ActionDefinition } from "@w6w/types";
import {
  assertCredential,
  json,
  spaceIdOf,
  StoryblokClient,
  validateContent,
} from "../lib/client.ts";

/**
 * `POST /v1/spaces/{id}/stories` — write a new content entry.
 *
 * ## The content has shape rules, and Storyblok's rejection does not name them
 *
 * Three rules, from Storyblok's own documentation:
 *
 * 1. `content` must be an **object** at the root.
 * 2. Every component object needs a `component` property naming its type.
 * 3. Every **nested** component needs a `_uid` as well.
 *
 * A missing `_uid` produces an error about a field, or — worse — imports
 * successfully and renders as an empty block that only the next person to open
 * the editor discovers. `validateContent` checks all three before sending, and
 * names the path of anything wrong.
 *
 * ## Stories are created unpublished unless you say otherwise
 *
 * Which is the right default for content coming from a migration or an
 * integration: it lands where an editor can see it and the public cannot. This
 * action keeps that default and makes publishing an explicit choice.
 *
 * ## The slug is the URL, and it is not derived from the name
 *
 * Storyblok will not invent one. A story created without a slug is reachable
 * by uuid and not by path, which looks like a broken import.
 */
const action: ActionDefinition = {
  key: "story-create",
  type: "perform",
  resource: "story",
  title: "Create a story",
  description:
    "Write a new content entry. Validates Storyblok's CONTENT SHAPE RULES first — every " +
    "component needs a `component` property and every nested one a `_uid` — because a missing " +
    "`_uid` either errors about a field or imports as an empty block nobody notices.",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "Name",
      type: "string",
      required: true,
      default: "",
      hint: "What editors see in the story list.",
    },
    {
      key: "slug",
      label: "Slug",
      type: "string",
      required: true,
      default: "",
      hint: "The URL segment. Storyblok does NOT derive one from the name, and a story without " +
        "a slug is unreachable by path.",
    },
    {
      key: "content",
      label: "Content",
      type: "json",
      required: true,
      default: "",
      placeholder: '{"component":"page","body":[]}',
      hint: "An object whose `component` names the content type. Nested components each need a " +
        "`_uid`.",
    },
    {
      key: "parentId",
      label: "Parent folder ID",
      type: "string",
      default: "",
      hint: "The folder to create it in. Empty puts it at the root.",
    },
    {
      key: "publish",
      label: "Publish immediately",
      type: "boolean",
      default: false,
      hint: "Off — the default — leaves it visible to editors and invisible to the public.",
    },
  ],
  output: [
    { key: "story", type: "object", label: "The created story" },
    { key: "id", type: "number", label: "Its numeric id" },
    { key: "uuid", type: "string", label: "Its stable id" },
    { key: "slug", type: "string", label: "Its path" },
    { key: "published", type: "boolean", label: "Whether it is live" },
    { key: "contentType", type: "string", label: "The root component" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    assertCredential(ctx.connection, "management");
    const spaceId = spaceIdOf(ctx.connection);
    if (!spaceId) throw new Error("this connection records no space id — reconnect to set one");

    const name = String(p.name ?? "").trim();
    if (!name) throw new Error("`name` is required");
    const slug = String(p.slug ?? "").trim().replace(/^\/+|\/+$/g, "");
    if (!slug) {
      throw new Error(
        "`slug` is required — Storyblok does not derive one from the name, and a story with no " +
          "slug is reachable only by uuid, which reads as a broken import",
      );
    }

    const content = json(p.content, "content");
    const problems = validateContent(content);
    if (problems.length) {
      throw new Error(
        `this content does not satisfy Storyblok's shape rules: ${problems.join("; ")}. ` +
          "Storyblok's own error names the field rather than the rule, and a missing `_uid` can " +
          "import successfully and render as an empty block",
      );
    }

    const publish = p.publish === true;
    const result = await new StoryblokClient(ctx).management<{
      story?: {
        id?: number;
        uuid?: string;
        full_slug?: string;
        published?: boolean;
        content?: Record<string, unknown>;
      };
    }>(`/spaces/${encodeURIComponent(spaceId)}/stories`, {
      method: "POST",
      body: {
        story: {
          name,
          slug,
          content,
          ...(String(p.parentId ?? "").trim() ? { parent_id: Number(p.parentId) } : {}),
        },
        publish: publish ? 1 : 0,
      },
    });

    const story = result?.story;
    // Ids and paths. The content is the customer's.
    ctx.log("info", "created a Storyblok story", { id: story?.id, slug, publish });

    return {
      story,
      id: story?.id,
      uuid: story?.uuid,
      slug: story?.full_slug ?? slug,
      published: publish,
      contentType: String((content as Record<string, unknown>)?.component ?? ""),
    };
  },
};

export default action;
