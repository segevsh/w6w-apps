import { snapshotTrigger } from "../lib/triggers.ts";
import contactList from "../actions/contact-list.ts";

export default snapshotTrigger({
  key: "new-contact",
  title: "New Contact",
  description: "The run gets each person newly added to the connected account's contacts.",
  action: contactList,
  input: () => ({}),
  idKey: "account_id",
  output: [
    { key: "account_id", type: "number", label: "Account ID" },
    { key: "room_id", type: "number", label: "Direct-chat room ID" },
    { key: "name", type: "string", label: "Display name" },
    { key: "chatwork_id", type: "string", label: "Chatwork ID" },
    { key: "organization_id", type: "number", label: "Organization ID" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "department", type: "string", label: "Department" },
    { key: "avatar_image_url", type: "string", label: "Avatar image URL" },
  ],
  sample: {
    account_id: 1234,
    room_id: 100300,
    name: "Ada Lovelace",
    chatwork_id: "ada",
    organization_id: 55,
    organization_name: "Analytical Engines",
    department: "Research",
    avatar_image_url: "https://example.com/ada.png",
  },
});
