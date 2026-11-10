import { pollFromListAction } from "../../_shared/poll/mod.ts";
import segmentList from "../actions/segment-list.ts";

/**
 * Sender documents `order` / `direction` on every list (https://api.sender.net/pagination/) and
 * shows `created` and `modified` in the segment resource (https://api.sender.net/segments/list-segments/).
 */
export default pollFromListAction({
  key: "new-or-updated-segment",
  title: "New or Updated Segment",
  description: "The run gets each segment when it is created or modified.",
  action: segmentList,
  input: () => ({ page: 1, limit: 100, order: "modified", direction: "desc" }),
  items: (result) => (result as { data?: unknown[] }).data ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id ?? ""}:${(item as { modified?: unknown }).modified ?? ""}`,
  output: [
    { key: "id", type: "string", label: "Segment ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "modified", type: "string", label: "Modified" },
  ],
  sample: { id: "segment-1", name: "Engaged readers", modified: "2026-11-10 09:30:00" },
  maxPages: 1,
});
