import chatMemberList from "../actions/chat-member-list.ts";
import { snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/chats/{chatId}/members?fields=name,email_id,user_id` through `chat-member-list`: one
 * `members` array with no paging (https://www.zoho.com/cliq/help/restapi/v2/, "Chats"), so the
 * chat's members are snapshot-diffed (additions only; more than 5000 members throws).
 */
export default snapshotTrigger({
  key: "new-chat-member",
  title: "New Chat Member",
  description: "The run gets each user who joins the chosen chat.",
  params: [{
    key: "chatId",
    label: "Chat ID",
    type: "string",
    required: true,
    hint: "Chat id (e.g. `CT_1254880203691219668_11543281`).",
  }],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email_id", type: "string", label: "Email" },
  ],
  sample: { user_id: "431930546", email_id: "olivia.palmer@zylcal.com", name: "Olivia Palmer" },
  rows: async (params, ctx) =>
    (await chatMemberList.execute({ chatId: str(params.chatId) }, ctx)).members,
  idOf: (item) => str((item as { user_id?: unknown }).user_id),
});
