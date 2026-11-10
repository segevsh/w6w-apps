import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/search-data-sources.ts";

const trigger = pollFromListAction({
  key: "new-or-updated-data-source",
  title: "New or Updated Data Source",
  description:
    "The run gets each data source the connection can see that was created or edited since the previous check, via Notion search sorted by last edited time, newest first. Search is indexed, so a change can appear a little after it is made.",
  action,
  input: () => ({
    sort: { direction: "descending", timestamp: "last_edited_time" },
    pageSize: 25,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id}:${(item as { last_edited_time?: unknown }).last_edited_time}`,
  output: [
    { key: "id", type: "string", label: "Data source ID" },
    { key: "title", type: "array", label: "Title" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "parent", type: "object", label: "Parent database" },
    { key: "properties", type: "object", label: "Properties" },
  ],
  sample: {
    "object": "data_source",
    "id": "a1d8501e-1ac1-43e9-a6bd-ea9fe6c8822b",
    "title": [
      {
        "type": "text",
        "plain_text": "Tasks",
      },
    ],
    "created_time": "2026-10-01T10:00:00.000Z",
    "last_edited_time": "2026-11-10T08:30:00.000Z",
    "parent": {
      "type": "database_id",
      "database_id": "0ef104cd-477e-80e1-8571-cfd10e92339a",
    },
    "properties": {},
  },
  maxPages: 1,
});

export default trigger;
