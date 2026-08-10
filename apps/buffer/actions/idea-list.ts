import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, idList, unset } from "../lib/client.ts";
import {
  afterParam,
  firstParam,
  ideaMembershipOptions,
  organizationIdParam,
  pageInfoOutput,
} from "../lib/params.ts";

/**
 * `query ideas($input: IdeasInput!, $first: Int, $after: String)` — the content
 * backlog.
 *
 * An *idea* is Buffer's draft-before-a-draft: *"a piece of draft content saved
 * for later. Ideas belong to an organization (not a channel) because they
 * haven't been assigned to a specific platform yet."* That is the whole
 * distinction from a post — an idea has no channel and therefore no schedule,
 * only an optional `services` list saying which networks it is *aimed* at.
 *
 * ## `groupFilter` is `@oneOf`, and the docs say so out loud
 *
 *   > Selects which ideas to return by group membership. **Exactly one field
 *   > must be provided (enforced by `@oneOf`).** To return ideas from all
 *   > groups, omit `groupFilter` on `IdeasInput` rather than setting a field
 *   > here.
 *
 * So the two filters below are mutually exclusive at the server, and supplying
 * neither is the way to say "everything" — not supplying both as null. This
 * action enforces the exclusivity locally and says which two fields collided,
 * because the server-side `@oneOf` violation arrives as a generic validation
 * error that does not name them.
 *
 * ## Pagination is a Relay connection, like `posts`
 *
 * `first`/`after` sit beside `input`, not inside it, and the response is
 * `edges { cursor node }` + `pageInfo`. `ideas` and `posts` are the only two
 * connections in the schema.
 *
 * ## Tags
 *
 * `tagsFilter` is a `TagComparator`: `in` (a union/OR over tag ids) plus
 * `isEmpty` ("include results that have no tags assigned … Can be combined with
 * `in` for union filtering"). `in` is non-null within the comparator, so
 * "untagged only" is expressed as `{ in: [], isEmpty: true }` rather than by
 * omitting `in` — which is why the untagged toggle sends an explicit empty
 * array here even though this app elsewhere treats `[]` as a value never to
 * invent.
 */
const IDEAS_QUERY = `query W6wIdeas($input: IdeasInput!, $first: Int, $after: String) {
  ideas(input: $input, first: $first, after: $after) {
    edges {
      cursor
      node {
        id
        organizationId
        groupId
        position
        createdAt
        updatedAt
        content {
          title
          text
          date
          services
          aiAssisted
          tags { id name color }
          media { url type alt thumbnailUrl }
        }
      }
    }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
  }
}`;

interface Input {
  organizationId: string;
  membership?: string;
  groupIds?: string;
  tagIds?: string;
  untaggedOnly?: boolean;
  first?: number;
  after?: string;
}

const ideaList: ActionDefinition<Input> = {
  key: "idea-list",
  type: "search",
  resource: "idea",
  title: "List Ideas",
  description:
    "Page through an organization's ideas — the content backlog that has not been assigned to " +
    "a channel yet. Cursor paginated.",
  params: [
    organizationIdParam,
    {
      key: "membership",
      label: "Group membership",
      type: "select",
      options: ideaMembershipOptions,
      hint: "Mutually exclusive with **Group IDs** — Buffer's `groupFilter` accepts exactly one " +
        "of the two. Leave both blank for every idea.",
    },
    {
      key: "groupIds",
      label: "Group IDs",
      type: "string",
      hint: "Comma-separated. From **List Idea Groups**. Mutually exclusive with **Group " +
        "membership**.",
    },
    { key: "tagIds", label: "Tag IDs", type: "string", advanced: true, hint: "Comma-separated." },
    {
      key: "untaggedOnly",
      label: "Include untagged",
      type: "boolean",
      advanced: true,
      hint: "Adds ideas with no tags at all. Combine with **Tag IDs** for a union of both.",
    },
    firstParam,
    afterParam,
  ],
  output: [
    { key: "ideas.edges", type: "array", label: "Edges" },
    { key: "ideas.edges[].cursor", type: "string", label: "Cursor" },
    { key: "ideas.edges[].node.id", type: "string", label: "Idea ID" },
    { key: "ideas.edges[].node.groupId", type: "string", label: "Group ID" },
    { key: "ideas.edges[].node.position", type: "number", label: "Position" },
    { key: "ideas.edges[].node.content", type: "object", label: "Content" },
    ...pageInfoOutput.map((f) => ({ ...f, key: `ideas.${f.key}` })),
  ],

  execute(input, ctx) {
    const groups = idList(input.groupIds);
    const membership = unset(input.membership);
    if (groups && membership) {
      throw new Error(
        "idea-list takes either Group IDs or Group membership, not both — Buffer's groupFilter " +
          "is @oneOf. Leave both blank for every idea.",
      );
    }

    const tagIds = idList(input.tagIds);
    // `TagComparator.in` is non-null, so "untagged only" has to send an
    // explicit empty array rather than omit the field.
    const tagsFilter = tagIds || input.untaggedOnly
      ? { in: tagIds ?? [], ...(input.untaggedOnly ? { isEmpty: true } : {}) }
      : undefined;

    return new BufferClient(ctx).request(IDEAS_QUERY, {
      input: compact({
        organizationId: input.organizationId,
        groupFilter: groups ? { groups } : membership ? { membership } : undefined,
        tagsFilter,
      }),
      first: input.first,
      after: unset(input.after),
    });
  },
};

export default ideaList;
