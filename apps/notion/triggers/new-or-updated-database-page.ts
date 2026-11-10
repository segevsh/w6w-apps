import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/get-many-database-pages.ts";

interface Params {
  dataSourceId: string;
}

const trigger = pollFromListAction<Params>({
  key: "new-or-updated-database-page",
  title: "New or Updated Database Page",
  description:
    "The run gets each page newly created or edited in a Notion data source, checked by last edited time, newest first. An edit to an existing page fires again.",
  action,
  params: [
    {
      key: "dataSourceId",
      label: "Data Source ID",
      type: "string",
      required: true,
      hint: "The data source (database table) to watch. Share it with the integration first.",
    },
  ],
  input: ({ dataSourceId }) => ({
    dataSourceId,
    sorts: [{ timestamp: "last_edited_time", direction: "descending" }],
    pageSize: 25,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) =>
    `${(item as { id?: unknown }).id}:${(item as { last_edited_time?: unknown }).last_edited_time}`,
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "url", type: "string", label: "URL" },
    { key: "parent", type: "object", label: "Parent" },
    { key: "properties", type: "object", label: "Properties" },
  ],
  sample: {
    "object": "page",
    "id": "59833787-2cf9-4fdf-8782-e53db20768a5",
    "created_time": "2026-11-09T10:00:00.000Z",
    "last_edited_time": "2026-11-10T08:30:00.000Z",
    "url": "https://www.notion.so/Roadmap-59833787",
    "parent": {
      "type": "data_source_id",
      "data_source_id": "a1d8501e-1ac1-43e9-a6bd-ea9fe6c8822b",
    },
    "properties": {},
  },
  maxPages: 1,
});

export default trigger;
