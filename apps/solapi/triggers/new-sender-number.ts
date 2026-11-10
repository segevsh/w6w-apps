import listSenderNumbers from "../actions/list-sender-numbers.ts";
import { snapshotTrigger } from "../lib/snapshot.ts";

/**
 * Snapshot poll (brief 9.1 c) over `list-sender-numbers`: GET /senderid/v1/numbers returns every registered sender number in one response (no paging), with its handleKey, so the registered numbers are watched as a snapshot.
 */
export default snapshotTrigger({
  key: "new-sender-number",
  title: "New Sender Number",
  description: "The run gets each sender number newly registered to the account.",
  output: [
    { key: "handleKey", type: "string", label: "Sender handle key" },
    { key: "phoneNumber", type: "string", label: "Phone number" },
    { key: "status", type: "string", label: "Status" },
    { key: "method", type: "string", label: "Verification method" },
  ],
  sample: { handleKey: "sender-101", phoneNumber: "01000000000", status: "ACTIVE", method: "SMS" },
  rows: async (ctx) => {
    const rows = (await listSenderNumbers.execute({}, ctx)) as {
      items?: Array<Record<string, unknown>>;
    };
    return rows.items ?? [];
  },
  idOf: (r) => String(r.handleKey ?? ""),
});
