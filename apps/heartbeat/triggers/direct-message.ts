import type { Param } from "@w6w/types";
import { requireParam, webhookTrigger } from "../lib/triggers.ts";

const ADMIN: Param = {
  key: "userId",
  label: "Admin user ID",
  type: "string",
  required: true,
  hint:
    "The admin whose incoming direct messages start the workflow (Heartbeat accepts admins only).",
};

/** An admin is sent a direct message (action `DIRECT_MESSAGE`, required filter `userID`). */
const directMessage = webhookTrigger({
  key: "direct-message",
  title: "Admin Received Direct Message",
  description:
    "Fires when the chosen admin is sent a direct message (action DIRECT_MESSAGE). The run gets the sender, the receiver, the chat id and the message id; List Direct Messages returns the text.",
  action: "DIRECT_MESSAGE",
  params: [ADMIN],
  filter: (p) => ({ userID: requireParam(p, "userId", "admin user ID") }),
  output: [
    { key: "senderUserID", type: "string", label: "Sender user ID" },
    { key: "receiverUserID", type: "string", label: "Receiver (admin) user ID" },
    { key: "chatID", type: "string", label: "Direct chat ID" },
    { key: "chatMessageID", type: "string", label: "Chat message ID" },
  ],
  sample: {
    action: "DIRECT_MESSAGE",
    senderUserID: "e6ccb009-ad46-4b09-a6e9-1412d9ff0601",
    receiverUserID: "0f4a9c1e-2b7d-4e63-9a58-3d1c7b2e8f90",
    chatID: "9e455d01-82d8-41a4-a176-fa4d9462e08b",
    chatMessageID: "5dbcf5c9-5e7e-4285-9dab-6d3ce7f4dd1e",
  },
});

export default directMessage;
