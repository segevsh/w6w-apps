import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient, numberList, stringList } from "../lib/client.ts";

interface Input {
  limit?: number;
  cursor?: string;
  from?: string;
  to?: string;
  linkedInAccountIds?: number[] | string;
  campaignIds?: number[] | string;
  searchString?: string;
  leadLinkedInId?: string;
  leadProfileUrl?: string;
  tags?: string[] | string;
  latestAutoTagNames?: string[] | string;
  seen?: boolean;
}

/**
 * `POST /api/public/inbox/GetConversationsV3` — LinkedIn conversations, newest
 * reply activity first.
 *
 * ## Cursor-paged, not offset-paged
 *
 * This is the one collection in the API that does not take `offset`: it returns
 * `nextCursor` and `hasNextPage`, and deep paging is why V3 exists at all
 * (`GetConversationsV2`, which the document describes as superseded, used
 * offsets and hit a limit on large inboxes). Keep passing `nextCursor` back while
 * `hasNextPage` is true; the cursor is opaque and a hand-edited one is a `400`.
 *
 * ## `from`/`to` bound the last message, and `to` has a default
 *
 * Both filter on `lastMessageAt` in UTC. Omitting `to` means "up to now" — the
 * API defaults it to the current time — so a `from`-only request is the normal
 * "what came in since" query. A `from` later than `to` is rejected with 400.
 *
 * ## Filters
 *
 * `leadLinkedInId` and `leadProfileUrl` are mutually exclusive. `seen` is
 * tri-state in the document — `true` for read, `false` for unread, `null` for
 * both — so it is sent only when set, which is the same as `null`.
 *
 * Unlike V2, the returned `correspondentProfile` deliberately carries **no**
 * email address or custom fields (the document says the three email keys were
 * always null there anyway); use `lead-get` when those are needed.
 */
const action: ActionDefinition<Input> = {
  key: "inbox-get-conversations",
  type: "search",
  resource: "inbox",
  title: "Get Conversations",
  description:
    "List LinkedIn conversations, cursor-paged, filtered by sender, campaign, lead, tag or " +
    "read state (POST /api/public/inbox/GetConversationsV3).",
  params: [
    {
      key: "limit",
      label: "Limit",
      type: "number",
      default: 10,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Conversations per page, 1–100. The API defaults to 10.",
    },
    {
      key: "cursor",
      label: "Cursor",
      type: "string",
      hint: "The `nextCursor` from the previous page. Omit for the first page.",
    },
    {
      key: "from",
      label: "Messages since",
      type: "datetime",
      hint: "ISO 8601, UTC. Lower bound on the conversation's last-message time.",
    },
    {
      key: "to",
      label: "Messages before",
      type: "datetime",
      hint: "ISO 8601, UTC. Upper bound on the last-message time; the API defaults it to now.",
    },
    {
      key: "linkedInAccountIds",
      label: "Sender accounts",
      type: "array",
      item: { type: "number" },
      hint: "Only conversations handled by these LinkedIn accounts.",
    },
    {
      key: "campaignIds",
      label: "Campaigns",
      type: "array",
      item: { type: "number" },
      hint: "Only conversations tied to these campaigns.",
    },
    { key: "searchString", label: "Search", type: "string", hint: "Free-text match." },
    {
      key: "leadLinkedInId",
      label: "LinkedIn member ID",
      type: "string",
      hint: "Cannot be combined with the profile URL.",
    },
    {
      key: "leadProfileUrl",
      label: "LinkedIn profile URL",
      type: "string",
      hint: "Cannot be combined with the LinkedIn member ID.",
    },
    {
      key: "tags",
      label: "Lead tags",
      type: "array",
      item: { type: "string" },
      hint: "Case-insensitive; the lead must carry at least one. Every tag must already exist.",
    },
    {
      key: "latestAutoTagNames",
      label: "Latest auto tags",
      type: "array",
      item: { type: "string" },
      hint: "Filter by the lead's most recent auto tag.",
    },
    {
      key: "seen",
      label: "Read",
      type: "boolean",
      hint: "On: only read conversations. Off: only unread. Leave unset for both.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Conversations" },
    { key: "totalCount", type: "number", label: "Total matching conversations" },
    { key: "nextCursor", type: "string", label: "Cursor for the next page" },
    { key: "hasNextPage", type: "boolean", label: "More pages available" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/inbox/GetConversationsV3", {
      method: "POST",
      body: compact({
        limit: input.limit,
        cursor: input.cursor,
        from: input.from,
        to: input.to,
        filters: compact({
          linkedInAccountIds: numberList(input.linkedInAccountIds, "Sender accounts"),
          campaignIds: numberList(input.campaignIds, "Campaigns"),
          searchString: input.searchString,
          leadLinkedInId: input.leadLinkedInId,
          leadProfileUrl: input.leadProfileUrl,
          tags: stringList(input.tags),
          latestAutoTagNames: stringList(input.latestAutoTagNames),
          seen: input.seen,
        }),
      }),
    });
  },
};

export default action;
