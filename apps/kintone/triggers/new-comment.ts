import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import commentsList from "../actions/comments-list.ts";

interface Params {
  appId: string;
  recordId: string;
}

export default pollFromListAction<Params>({
  key: "new-comment",
  title: "New Comment",
  description: "Fires when a comment is added to the selected Kintone record.",
  action: commentsList as ActionDefinition,
  params: [
    { key: "appId", label: "App ID", type: "string", required: true },
    { key: "recordId", label: "Record ID", type: "string", required: true },
  ],
  input: ({ appId, recordId }) => ({ appId, recordId, order: "desc", offset: 0, limit: 10 }),
  items: (result) => (result as { comments?: unknown[] }).comments ?? [],
  idOf: (item) => String((item as { id: unknown }).id),
  output: [{ key: "id", type: "string", label: "Comment ID" }],
  sample: { id: "comment_123" },
});
