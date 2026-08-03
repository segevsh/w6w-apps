import type { ActionDefinition } from "@w6w/types";
import { BufferClient, compact, idList, unset } from "../lib/client.ts";
import {
  afterParam,
  dueAtPresenceOptions,
  firstParam,
  organizationIdParam,
  pageInfoOutput,
  POST_FIELDS,
  postSortFieldOptions,
  postStatusOptions,
  sortDirectionOptions,
} from "../lib/params.ts";

/**
 * `query posts($input: PostsInput!, $first: Int, $after: String)` — the queue,
 * the history, and everything in between.
 *
 * ## Cursor pagination, and the arguments that are not in `input`
 *
 * `first` and `after` sit at the *field* level, beside `input`, not inside it.
 * That is easy to get wrong from the guide prose alone; the operation shape is
 * confirmed by Buffer's own generated CLI document
 * (`query Posts($input: PostsInput!, $first: Int, $after: String)`) and by the
 * `get-paginated-posts` example, which passes `after:` and `first:` as sibling
 * arguments to `input:`.
 *
 * Page forward by feeding `pageInfo.endCursor` back in as **Cursor**. There is
 * no offset/page-number form — Buffer's REST-migration notes list cursor-based
 * pagination as one of the deliberate breaks from the legacy API.
 *
 * ## Two date filters that are not the same date
 *
 * `PostsFiltersInput` carries **five** temporal fields and they mean different
 * things:
 *
 *  - `startDate` / `endDate` — Buffer's own wording is *"return posts with
 *    createdAt **or** dueAt date after startDate"*. One bound, either
 *    timestamp. Blunt, and it is what the vendor documents.
 *  - `dueAt: { start, end }` — a `DateTimeComparator` on the scheduled time
 *    alone.
 *  - `createdAt: { start, end }` — the same comparator on creation time.
 *  - `dueAtPresence` — `present` or `absent`, i.e. "is it scheduled at all".
 *    Buffer notes that *"`absent` cannot be combined with `dueAt`, because
 *    absent dates cannot also match a date range"*, which is why the hint on
 *    each names the other.
 *
 * All four are exposed rather than collapsed into one "date range", because
 * collapsing them would silently pick one meaning for the user.
 *
 * ## Sorting is a list, for tie-breaking
 *
 * `sort` is `[PostSortInput!]` — *"List multiple to create tie-breaking
 * order."* Buffer's own examples always pass two
 * (`[{field: dueAt, direction: asc}, {field: createdAt, direction: desc}]`),
 * because posts sharing a slot otherwise come back in an arbitrary order. This
 * action exposes one primary sort and appends `createdAt desc` as the
 * tie-breaker whenever a primary is given, matching what the vendor
 * demonstrates — and skips `sort` entirely when none is asked for, rather than
 * imposing an order Buffer did not choose.
 *
 * ## Statuses, in Buffer's spelling
 *
 * `draft`, `needs_approval`, `scheduled`, `sending`, `sent`, `error`. Note the
 * underscore in the middle one — it is the only member of any Buffer enum in
 * this app that is not camelCase, and a `needsApproval` guess would 400. The
 * provenance of the whole vocabulary is documented in `lib/params.ts`.
 */
const POSTS_QUERY = `query W6wPosts($input: PostsInput!, $first: Int, $after: String) {
  posts(input: $input, first: $first, after: $after) {
    edges {
      cursor
      node {
${POST_FIELDS}
      }
    }
    pageInfo { hasNextPage hasPreviousPage startCursor endCursor }
  }
}`;

interface Input {
  organizationId: string;
  status?: string[] | string;
  channelIds?: string;
  tagIds?: string;
  startDate?: string;
  endDate?: string;
  dueAtStart?: string;
  dueAtEnd?: string;
  dueAtPresence?: string;
  sortField?: string;
  sortDirection?: string;
  first?: number;
  after?: string;
}

/** A multiselect arrives as an array; be tolerant of a single string too. */
function toArray(v: string[] | string | undefined): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : [v]).filter(Boolean);
  return items.length ? items : undefined;
}

const postList: ActionDefinition<Input> = {
  key: "post-list",
  type: "search",
  resource: "post",
  title: "List Posts",
  description:
    "Page through an organization's posts, filtered by channel, status, tag or date. Cursor " +
    "paginated — feed `pageInfo.endCursor` back in as the cursor.",
  params: [
    organizationIdParam,
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: postStatusOptions,
      hint: "Omit for every status. Note `needs_approval` is spelled with an underscore.",
    },
    {
      key: "channelIds",
      label: "Channel IDs",
      type: "string",
      hint: "Comma-separated. Omit for every channel in the organization.",
    },
    { key: "tagIds", label: "Tag IDs", type: "string", advanced: true, hint: "Comma-separated." },
    {
      key: "startDate",
      label: "From (createdAt or dueAt)",
      type: "datetime",
      hint: "Matches posts whose **createdAt _or_ dueAt** is after this. For the scheduled time " +
        "alone, use the two `dueAt` fields instead.",
    },
    {
      key: "endDate",
      label: "To (createdAt or dueAt)",
      type: "datetime",
      hint: "Matches posts whose **createdAt _or_ dueAt** is before this.",
    },
    {
      key: "dueAtStart",
      label: "Scheduled after",
      type: "datetime",
      advanced: true,
      hint: "Filters on the scheduled time only. Cannot be combined with a `Scheduled time " +
        "present` of *absent*.",
    },
    {
      key: "dueAtEnd",
      label: "Scheduled before",
      type: "datetime",
      advanced: true,
    },
    {
      key: "dueAtPresence",
      label: "Scheduled time present",
      type: "select",
      options: dueAtPresenceOptions,
      advanced: true,
      hint: "`absent` finds unscheduled posts — drafts and ideas-turned-posts. Buffer rejects " +
        "it alongside a `Scheduled after`/`before` range.",
    },
    {
      key: "sortField",
      label: "Sort by",
      type: "select",
      options: postSortFieldOptions,
      hint: "Omitted entirely when blank — Buffer picks its own order.",
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: sortDirectionOptions,
      default: "asc",
      dependsOn: ["sortField"],
    },
    firstParam,
    afterParam,
  ],
  output: [
    { key: "posts.edges", type: "array", label: "Edges" },
    { key: "posts.edges[].cursor", type: "string", label: "Cursor" },
    { key: "posts.edges[].node", type: "object", label: "Post" },
    ...pageInfoOutput.map((f) => ({ ...f, key: `posts.${f.key}` })),
  ],

  execute(input, ctx) {
    const dueAt = compact({ start: unset(input.dueAtStart), end: unset(input.dueAtEnd) });
    const filter = compact({
      status: toArray(input.status),
      channelIds: idList(input.channelIds),
      tagIds: idList(input.tagIds),
      startDate: unset(input.startDate),
      endDate: unset(input.endDate),
      dueAt: Object.keys(dueAt).length ? dueAt : undefined,
      dueAtPresence: unset(input.dueAtPresence),
    });

    // Buffer's own examples always pair the primary sort with `createdAt desc`
    // so posts sharing a slot come back in a stable order. Only appended when
    // the primary is something else, and never invented when no sort is asked
    // for.
    const sort = input.sortField
      ? [
        { field: input.sortField, direction: input.sortDirection || "asc" },
        ...(input.sortField === "createdAt" ? [] : [{ field: "createdAt", direction: "desc" }]),
      ]
      : undefined;

    return new BufferClient(ctx).request(POSTS_QUERY, {
      input: compact({
        organizationId: input.organizationId,
        filter: Object.keys(filter).length ? filter : undefined,
        sort,
      }),
      first: input.first,
      after: unset(input.after),
    });
  },
};

export default postList;
