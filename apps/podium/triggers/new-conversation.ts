import { pollFromListAction } from "../../_shared/poll/mod.ts";
import conversationList from "../actions/conversation-list.ts";

function idOf(item: unknown): string {
  const id = (item as { uid?: unknown }).uid;
  if (id === undefined || id === null) throw new Error("Podium conversation has no stable uid");
  return String(id);
}

export default pollFromListAction<Record<string, unknown>>({
  key: "new-conversation",
  title: "New Conversation",
  description: "The run gets each conversation newly returned by List Conversations.",
  action: conversationList,
  input: (params) => ({ ...params, cursor: undefined, limit: 100, order: "desc" }),
  items: (result) => ((result as { items?: unknown[] }).items ?? []),
  idOf,
  params: conversationList.params,
  output: [{ key: "uid", type: "string", label: "Conversation UID" }],
  sample: { uid: "conversation_1" },
  maxPages: 1,
});
