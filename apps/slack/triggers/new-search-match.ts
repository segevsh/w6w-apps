import type { ActionDefinition } from "@w6w/types";
import { pollFromListAction } from "../../_shared/poll/mod.ts";
import messageSearch from "../actions/message-search.ts";

interface Input {
  query: string;
}

/**
 * Slack's search.messages is Tier 2 (20+ calls a minute) and supports `sort=timestamp` with
 * `sort_dir=desc` (https://docs.slack.dev/reference/methods/search.messages, verified 2026-11-10),
 * so page one is the newest matches. It needs a user token with `search:read`.
 */
const newSearchMatch = pollFromListAction<Input>({
  key: "new-search-match",
  title: "New Message Matching a Search",
  description:
    "Polls Slack message search, newest first, and emits each new message that matches the query. Needs a user token with search:read. The run gets the matching message.",
  action: messageSearch as unknown as ActionDefinition,
  input: (params) => ({ query: params.query, sort: "desc", count: 100 }),
  items: (result) => {
    const matches = (result as { messages?: { matches?: unknown } } | null)?.messages?.matches;
    return Array.isArray(matches) ? matches : [];
  },
  idOf: (item) => {
    const m = item as { channel?: { id?: unknown }; ts?: unknown; iid?: unknown };
    const channel = typeof m.channel?.id === "string" ? m.channel.id : "";
    const ts = typeof m.ts === "string" ? m.ts : "";
    return channel && ts ? `${channel}:${ts}` : typeof m.iid === "string" ? m.iid : "";
  },
  params: [{
    key: "query",
    label: "Search query",
    type: "string",
    required: true,
    hint: "Slack search syntax, e.g. in:#support from:@ada invoice.",
  }],
  output: [
    { key: "text", type: "string", label: "Message text" },
    { key: "ts", type: "string", label: "Message timestamp" },
    { key: "user", type: "string", label: "User ID" },
    { key: "username", type: "string", label: "Username" },
    { key: "permalink", type: "string", label: "Permalink" },
    { key: "channel", type: "object", label: "Channel" },
  ],
  sample: {
    iid: "cb64bdaa-c1e8-4631-8a91-0f78080113e9",
    type: "message",
    team: "T12345678",
    channel: { id: "C12345678", name: "support" },
    user: "U2U85N1RV",
    username: "ada",
    ts: "1508284197.000015",
    text: "Invoice 42 is overdue",
    permalink: "https://slack.com/archives/C12345678/p1508284197000015",
  },
});

export default newSearchMatch;
