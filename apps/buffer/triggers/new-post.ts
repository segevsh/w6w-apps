import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import postList from "../actions/post-list.ts";

interface Params {
  organizationId: string;
}

export default pollFromListAction<Params>({
  key: "new-post",
  title: "New Post",
  description:
    "The run gets each newly created Buffer post in an organization (sorted by createdAt, newest first).",
  action: postList as unknown as ActionDefinition,
  input: (p) => ({
    organizationId: p.organizationId,
    sortField: "createdAt",
    sortDirection: "desc",
    first: 100,
  }),
  params: [{ key: "organizationId", label: "Organization ID", type: "string", required: true }],
  items: (r) =>
    ((r as { posts?: { edges?: Array<{ node: unknown }> } }).posts?.edges ?? []).map((e) => e.node),
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Post ID" },
    { key: "text", type: "string", label: "Post text" },
    { key: "status", type: "string", label: "Status" },
    { key: "channelId", type: "string", label: "Channel ID" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],
  sample: {
    id: "post-1",
    text: "Hello from Buffer",
    status: "scheduled",
    channelId: "channel-1",
    createdAt: "2026-11-09T09:00:00.000Z",
  },
  maxPages: 1,
});
