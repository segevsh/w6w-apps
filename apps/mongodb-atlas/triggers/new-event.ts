import { pollFromListAction } from "../../_shared/poll/mod.ts";
import eventList from "../actions/event-list.ts";

export default pollFromListAction({
  key: "new-event",
  title: "New Event",
  description: "The run gets each newly recorded MongoDB Atlas project event.",
  action: eventList,
  input: (params: { projectId: string }) => ({ ...params, itemsPerPage: 100, pageNum: 1 }),
  items: (result) => (result as { events?: unknown[] }).events ?? [],
  idOf: (item) =>
    String(
      (item as { id?: unknown; eventTypeName?: unknown; created?: unknown }).id ??
        `${String((item as { eventTypeName?: unknown }).eventTypeName ?? "")}:${
          String((item as { created?: unknown }).created ?? "")
        }`,
    ),
  params: [{ key: "projectId", label: "Project ID", type: "string", required: true }],
  output: [{ key: "eventTypeName", type: "string", label: "Event type" }],
  sample: { eventTypeName: "CLUSTER_CREATED", created: "2026-11-09T12:00:00Z" },
  maxPages: 1,
});
