import sendersList from "../actions/senders-list.ts";
import { snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c). `GET /senders` is unpaged and returns the account's authorized "From"
 * addresses in one request (https://api.sendpulse.com/.well-known/openapi/bulk-email.yaml, `/senders`).
 * A sender is identified by its email address.
 */
export default snapshotTrigger({
  key: "new-sender",
  title: "New Sender",
  description: "The run gets each sender (From address) newly added to the account.",
  output: [
    { key: "email", type: "string", label: "Sender email" },
    { key: "name", type: "string", label: "Sender name" },
  ],
  sample: { email: "news@example.com", name: "Example News" },
  rows: async (_p, ctx) => {
    const res = await sendersList.execute({}, ctx) as unknown;
    const rows = Array.isArray(res) ? res : (res as { data?: unknown })?.data;
    return Array.isArray(rows) ? rows as Array<Record<string, unknown>> : [];
  },
  idOf: (r) => String(r.email),
});
