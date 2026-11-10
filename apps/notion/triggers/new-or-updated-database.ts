import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/search-databases.ts";

const trigger = pollFromListAction({
  key: "new-or-updated-database",
  title: "New or Updated Database",
  description:
    "The run gets each database (the container of one or more data sources) created or edited since the previous check, found through Notion search sorted by last edited time, newest first. Search is indexed, so a change can appear a little after it is made.",
  action,
  input: () => ({
    sort: { direction: "descending", timestamp: "last_edited_time" },
    pageSize: 25,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id}:${(item as { last_edited_time?: unknown }).last_edited_time}`,
  output: [
    { key: "id", type: "string", label: "Database ID" },
    { key: "title", type: "array", label: "Title" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "url", type: "string", label: "URL" },
    { key: "data_sources", type: "array", label: "Data sources" },
  ],
  sample: {
    "object": "database",
    "id": "0ef104cd-477e-80e1-8571-cfd10e92339a",
    "title": [
      {
        "type": "text",
        "plain_text": "Tasks",
      },
    ],
    "created_time": "2026-10-01T10:00:00.000Z",
    "last_edited_time": "2026-11-10T08:30:00.000Z",
    "url": "https://www.notion.so/Tasks-0ef104cd",
    "data_sources": [
      {
        "id": "a1d8501e-1ac1-43e9-a6bd-ea9fe6c8822b",
        "name": "Tasks",
      },
    ],
  },
  maxPages: 1,
});

export default trigger;
