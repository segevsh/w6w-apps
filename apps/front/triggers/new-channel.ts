import action from "../actions/channel-list.ts";
import { bounded } from "../lib/triggers.ts";

/** `GET /channels` — the company's channels, one request (https://dev.frontapp.com/reference/list-channels, verified 2026-11-10). */
export default bounded({
  key: "new-channel",
  title: "New Channel",
  description:
    "The run gets each channel newly connected to the Front company (checked on a schedule).",
  action,
  output: [
    { key: "id", type: "string", label: "Channel ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "address", type: "string", label: "Address" },
    { key: "type", type: "string", label: "Channel type" },
    { key: "is_private", type: "boolean", label: "Private" },
  ],
  sample: {
    id: "cha_4d5e",
    name: "Support email",
    address: "support@example.test",
    type: "smtp",
    is_private: false,
  },
});
