import type { ActionDefinition } from "@w6w/types";
import { API_PREFIX, encodeId, encodeSegment, RingCentralClient } from "../lib/client.ts";
import { accountIdParam, extensionIdParam } from "../lib/params.ts";

/**
 * `GET /restapi/v1.0/account/{accountId}/extension/{extensionId}/message-store/{messageId}`
 * — one message record. Needs `ReadMessages` (app + user).
 *
 * The vendor documents a bulk form of this path (`messageId` accepts several
 * comma-joined ids and the response becomes a list), used for fetching many
 * known ids in one call. This action only builds the single-id form — the
 * bulk response is a materially different shape (a list wrapper instead of one
 * record) that would make this action's `output` a lie half the time.
 */
interface Input {
  accountId?: string;
  extensionId?: string;
  messageId: string;
}

const messageStoreGet: ActionDefinition<Input> = {
  key: "message-store-get",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Fetch one message record by ID.",
  params: [
    accountIdParam,
    extensionIdParam,
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Message ID" },
    { key: "type", type: "string", label: "Message type" },
    { key: "direction", type: "string", label: "Direction" },
    { key: "availability", type: "string", label: "Alive / Deleted / Purged" },
    { key: "readStatus", type: "string", label: "Read / Unread" },
    { key: "subject", type: "string", label: "Subject / SMS text" },
    { key: "from", type: "object", label: "Sender" },
    { key: "to", type: "array", label: "Recipients" },
    { key: "attachments", type: "array", label: "Attachments" },
    { key: "creationTime", type: "string", label: "Creation time (ISO 8601)" },
  ],

  execute(input, ctx) {
    return new RingCentralClient(ctx).request(
      `${API_PREFIX}/account/${encodeId(input.accountId)}/extension/${
        encodeId(input.extensionId)
      }/message-store/${encodeSegment(input.messageId)}`,
    );
  },
};

export default messageStoreGet;
