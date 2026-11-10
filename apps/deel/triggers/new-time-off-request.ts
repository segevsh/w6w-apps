import { snapshotList } from "../lib/snapshot.ts";
import { DeelClient } from "../lib/client.ts";

export default snapshotList<{ hrisProfileId: string }>({
  key: "new-time-off-request",
  title: "New Time-off Request",
  description: "The run gets each new time-off request of the chosen worker.",
  params: [{
    key: "hrisProfileId",
    label: "HRIS Profile ID",
    type: "string",
    required: true,
    default: "",
  }],
  // Vendor pager: `page_size` + `next` token (the list action sends limit/offset).
  list: (p, ctx) => {
    const id = String(p.hrisProfileId ?? "").trim();
    if (!id) throw new Error("`hrisProfileId` is required");
    return new DeelClient(ctx).requestAllNext(`/time_offs/profile/${encodeURIComponent(id)}`);
  },
  output: [
    { key: "id", type: "string", label: "Request ID" },
    { key: "status", type: "string", label: "Status" },
  ],
  sample: { id: "t1", status: "approved" },
});
