import channelMemberList from "../actions/channel-member-list.ts";
import { snapshotTrigger, str } from "../lib/triggers.ts";

/**
 * `GET /api/v2/channels/{channelId}/members` through `channel-member-list`: the response is one
 * `members` array with no paging (https://www.zoho.com/cliq/help/restapi/v2/, "Channels"), so the
 * channel's members are snapshot-diffed (additions only; more than 5000 members throws).
 */
export default snapshotTrigger({
  key: "new-channel-member",
  title: "New Channel Member",
  description: "The run gets each user who joins the chosen channel.",
  params: [{
    key: "channelId",
    label: "Channel ID",
    type: "string",
    required: true,
    hint: "Channel id (e.g. `O1864232000000076001`), from List Channels.",
  }],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email_id", type: "string", label: "Email" },
    { key: "user_role", type: "string", label: "Role" },
  ],
  sample: {
    user_id: "1234567",
    email_id: "scott.fisher@zylker.com",
    name: "Scott Fisher",
    user_role: "member",
  },
  rows: async (params, ctx) =>
    (await channelMemberList.execute({ channelId: str(params.channelId) }, ctx)).members,
  idOf: (item) => str((item as { user_id?: unknown }).user_id),
});
