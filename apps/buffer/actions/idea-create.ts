import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, unset } from "../lib/client.ts";
import { MUTATION_ERROR_TAIL, organizationIdParam, SERVICE_VALUES } from "../lib/params.ts";

/**
 * `mutation createIdea(input: CreateIdeaInput!)` — file something in the
 * backlog.
 *
 * An idea belongs to an *organization*, never a channel, because it has not
 * been aimed at a platform yet. `services` is the closest thing to a target,
 * and it is advisory: *"Services tagged by the user — this is typically used to
 * annotate ideas with their target services."* Nothing schedules from it.
 *
 * ## The success arm is two types wide
 *
 * `CreateIdeaPayload` resolves to `Idea` **or** `IdeaResponse` (which wraps
 * `idea` alongside a `refreshIdeas` hint), plus the usual error arms —
 * `InvalidInputError`, `UnauthorizedError`, `UnexpectedError`,
 * `LimitReachedError`. Both success shapes are accepted by `unwrapMutation`,
 * and both are selected below, because taking only `Idea` would turn a
 * successful creation into a thrown error the day Buffer returns the wrapper.
 *
 * Buffer's own `create-idea` example selects only `... on Idea`, with no error
 * arm at all — which contradicts its own error-handling guidance
 * (*"Always include `... on MutationError` in every mutation"*). This action
 * follows the guidance rather than the example.
 *
 * ## Media is pass-through, and one of its types is documented broken
 *
 * `IdeaMediaInput` is `{ url, type, alt?, thumbnailUrl?, size?, source? }` with
 * `type` a `MediaType`. Buffer's own field description reads: *"The type of
 * media (image, gif, video, link, document, unsupported). Note: **'video' is
 * not supported via public API**."* So four of six members work, one is
 * declared non-functional and one is a sentinel.
 *
 * Rather than render that as a clean six-way select, media is a JSON array
 * passed through unchanged with the caveat on the field. A dropdown offering
 * `video` would be offering something the vendor says does not work.
 *
 * ## Tags need three fields, not an id
 *
 * `TagInput` is `{ id, name, color }` and **all three are non-null** — unlike
 * every other tag reference in this schema, which takes a bare `TagId`. So an
 * idea cannot be tagged by id alone, and there is no tag-listing query in the
 * API to look the other two up from. Tags are therefore exposed as raw JSON
 * with that requirement spelled out, rather than as a comma-separated id field
 * that would always fail validation.
 *
 * Not idempotent: every call mints a new idea.
 */
const CREATE_IDEA = `mutation W6wCreateIdea($input: CreateIdeaInput!) {
  createIdea(input: $input) {
${MUTATION_ERROR_TAIL}
    ... on Idea {
      id
      organizationId
      groupId
      position
      createdAt
      updatedAt
      content { title text date services aiAssisted }
    }
    ... on IdeaResponse {
      refreshIdeas
      idea {
        id
        organizationId
        groupId
        position
        createdAt
        updatedAt
        content { title text date services aiAssisted }
      }
    }
  }
}`;

interface Input {
  organizationId: string;
  title?: string;
  text?: string;
  date?: string;
  services?: string[] | string;
  groupId?: string;
  placeAfterId?: string;
  media?: unknown;
  tags?: unknown;
  aiAssisted?: boolean;
}

function toArray(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : [v]).filter(Boolean);
  return items.length ? items : undefined;
}

function jsonArray(v: unknown, label: string): unknown[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const parsed = typeof v === "string" ? parse(v, label) : v;
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array`);
  return parsed.length ? parsed : undefined;
}

function parse(v: string, label: string): unknown {
  try {
    return JSON.parse(v);
  } catch {
    throw new Error(`${label} is not valid JSON`);
  }
}

const ideaCreate: ActionDefinition<Input> = {
  key: "idea-create",
  type: "perform",
  resource: "idea",
  title: "Create Idea",
  description:
    "Save a piece of content to an organization's idea board. Ideas have no channel and no " +
    "schedule — the target networks are an annotation only.",
  idempotent: false,
  params: [
    organizationIdParam,
    { key: "title", label: "Title", type: "string" },
    { key: "text", label: "Text", type: "text", config: { multiline: true } },
    {
      key: "date",
      label: "Target date",
      type: "datetime",
      hint: 'Planning annotation — *"often reflects a target publish date"*. Nothing ' +
        "publishes from it.",
    },
    {
      key: "services",
      label: "Target networks",
      type: "multiselect",
      options: SERVICE_VALUES.map((value) => ({ value, label: value })),
      hint: "Annotation only. An idea is not attached to a channel and does not get scheduled " +
        "from this.",
    },
    {
      key: "groupId",
      label: "Group ID",
      type: "string",
      hint: "From **List Idea Groups**. Omit for the unassigned group.",
    },
    {
      key: "placeAfterId",
      label: "Place after idea ID",
      type: "string",
      advanced: true,
      hint: "Orders the new idea after this one within the group. Omit for the top.",
    },
    {
      key: "media",
      label: "Media",
      type: "json",
      advanced: true,
      hint: 'Raw `[IdeaMediaInput!]`, e.g. `[{"url":"<public image url>","type":"image"}]`. ' +
        "`type` is one of `image`, `gif`, `link`, `document` — Buffer documents `video` as " +
        "**not supported via the public API**.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "json",
      advanced: true,
      hint: "Raw `[TagInput!]`. Buffer requires **id, name and colour on every tag** here — " +
        "unlike posts, an idea cannot be tagged by id alone, and there is no tag-listing " +
        "query to look the rest up from.",
    },
    { key: "aiAssisted", label: "AI assisted", type: "boolean", advanced: true },
  ],
  output: [
    { key: "id", type: "string", label: "Idea ID" },
    { key: "organizationId", type: "string", label: "Organization ID" },
    { key: "groupId", type: "string", label: "Group ID" },
    { key: "position", type: "number", label: "Position" },
    { key: "content", type: "object", label: "Content" },
    { key: "createdAt", type: "number", label: "Created at (unix)" },
    { key: "updatedAt", type: "number", label: "Updated at (unix)" },
    { key: "idea", type: "object", label: "Idea (when wrapped in IdeaResponse)" },
  ],

  execute(input, ctx) {
    const content = compact({
      title: unset(input.title),
      text: unset(input.text),
      date: unset(input.date),
      services: toArray(input.services),
      media: jsonArray(input.media, "Media"),
      tags: jsonArray(input.tags, "Tags"),
      aiAssisted: input.aiAssisted === undefined ? undefined : input.aiAssisted,
    });
    if (Object.keys(content).length === 0) {
      throw new Error("idea-create needs at least a title or some text");
    }

    const group = compact({
      groupId: unset(input.groupId),
      placeAfterId: unset(input.placeAfterId),
    });

    return new BufferClient(ctx).mutate(
      CREATE_IDEA,
      {
        input: compact({
          organizationId: input.organizationId,
          content,
          group: Object.keys(group).length ? group : undefined,
        }),
      },
      "createIdea",
      ["Idea", "IdeaResponse"],
    );
  },
};

export default ideaCreate;
