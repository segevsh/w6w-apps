import { snapshotTrigger } from "../lib/triggers.ts";
import roomMemberList from "../actions/room-member-list.ts";

interface Params {
  roomId: string;
}

export default snapshotTrigger<Params>({
  key: "new-room-member",
  title: "New Chat Member",
  description: "The run gets each person newly added to a Chatwork chat.",
  action: roomMemberList,
  input: (p) => ({ roomId: p.roomId }),
  idKey: "account_id",
  params: [{ key: "roomId", label: "Room ID", type: "string", required: true }],
  output: [
    { key: "account_id", type: "number", label: "Account ID" },
    { key: "role", type: "string", label: "admin | member | readonly" },
    { key: "name", type: "string", label: "Display name" },
    { key: "chatwork_id", type: "string", label: "Chatwork ID" },
    { key: "organization_id", type: "number", label: "Organization ID" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "department", type: "string", label: "Department" },
    { key: "avatar_image_url", type: "string", label: "Avatar image URL" },
  ],
  sample: {
    account_id: 1234,
    role: "member",
    name: "Ada Lovelace",
    chatwork_id: "ada",
    organization_id: 55,
    organization_name: "Analytical Engines",
    department: "Research",
    avatar_image_url: "https://example.com/ada.png",
  },
});
