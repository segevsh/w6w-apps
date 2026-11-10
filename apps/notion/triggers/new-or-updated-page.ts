import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/search-pages.ts";

const trigger = pollFromListAction({
  key: "new-or-updated-page",
  title: "New or Updated Page",
  description:
    "The run gets each page in the workspace that was created or edited since the previous check, via Notion search sorted by last edited time, newest first. An edit fires again. Search is indexed, so a page can appear a little after the change.",
  action,
  input: () => ({
    sort: { direction: "descending", timestamp: "last_edited_time" },
    pageSize: 25,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id}:${(item as { last_edited_time?: unknown }).last_edited_time}`,
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "parent", type: "object", label: "Parent" },
    { key: "properties", type: "object", label: "Properties" },
  ],
  sample: {
    "object": "page",
    "id": "59833787-2cf9-4fdf-8782-e53db20768a5",
    "created_time": "2026-11-09T10:00:00.000Z",
    "last_edited_time": "2026-11-10T08:30:00.000Z",
    "parent": {
      "type": "data_source_id",
      "data_source_id": "a1d8501e-1ac1-43e9-a6bd-ea9fe6c8822b",
    },
    "properties": {},
  },
  maxPages: 1,
});

export default trigger;
