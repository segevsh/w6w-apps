import { pollFromListAction } from "../../_shared/poll/mod.ts";
import segmentList from "../actions/segment-list.ts";

/**
 * Sender documents `order` / `direction` on every list (https://api.sender.net/pagination/) and
 * shows `created` and `modified` in the segment resource (https://api.sender.net/segments/list-segments/).
 */
export default pollFromListAction({
  key: "new-segment",
  title: "New Segment",
  description: "The run gets each newly created segment.",
  action: segmentList,
  input: () => ({ page: 1, limit: 100, order: "created", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "created", type: "string", label: "Created" },
  ],
  sample: { id: "segment-1", name: "Engaged readers", created: "2026-11-10 09:00:00" },
  maxPages: 1,
});
