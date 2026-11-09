import { pollFromListAction } from "../../_shared/poll/mod.ts";
import action from "../actions/get-many-database-pages.ts";

interface Params {
  dataSourceId: string;
}

const trigger = pollFromListAction<Params>({
  key: "new-database-page",
  title: "New Database Page",
  description:
    "The run gets each page newly created in a Notion data source, checked newest-first by created time.",
  action,
  params: [{
    key: "dataSourceId",
    label: "Data Source ID",
    type: "string",
    required: true,
    hint: "The data source (database table) to watch. Share it with the integration first.",
  }],
  input: ({ dataSourceId }) => ({
    dataSourceId,
    sorts: [{ timestamp: "created_time", direction: "descending" }],
    pageSize: 25,
  }),
  items: (result) => (result as { results?: unknown[] }).results ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Page ID" },
    { key: "created_time", type: "string", label: "Created time" },
    { key: "last_edited_time", type: "string", label: "Last edited time" },
    { key: "properties", type: "object", label: "Properties" },
  ],
  sample: {
    object: "page",
    id: "59833787-2cf9-4fdf-8782-e53db20768a5",
    created_time: "2026-11-09T10:00:00.000Z",
    last_edited_time: "2026-11-09T10:00:00.000Z",
    properties: {},
  },
  maxPages: 1,
});

export default trigger;
