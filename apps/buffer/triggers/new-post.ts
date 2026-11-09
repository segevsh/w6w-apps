import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import postList from "../actions/post-list.ts";

export default pollFromListAction({
  key: "new-post",
  title: "New Post",
  description: "The run gets each newly created Buffer post.",
  action: postList as unknown as ActionDefinition,
  input: (p: { organizationId: string }) => ({
    organizationId: p.organizationId,
    sortField: "createdAt",
    sortDirection: "desc",
    first: 100,
  }),
  params: [{ key: "organizationId", label: "Organization ID", type: "string", required: true }],
  items: (r) =>
    ((r as { posts?: { edges?: Array<{ node: unknown }> } }).posts?.edges ?? []).map((e) => e.node),
  idOf: (v) => String((v as { id?: unknown }).id ?? ""),
  output: [{ key: "id", type: "string", label: "Post ID" }],
  sample: { id: "post-1" },
  maxPages: 1,
});
