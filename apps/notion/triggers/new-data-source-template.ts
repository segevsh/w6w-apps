import { snapshotTrigger } from "../lib/triggers.ts";
import action from "../actions/list-data-source-templates.ts";

interface Params {
  dataSourceId: string;
}

export default snapshotTrigger<Params>({
  key: "new-data-source-template",
  title: "New Data Source Template",
  description:
    "The run gets each page template newly added to one Notion data source. Templates come back in no guaranteed order, so every check reads the list and compares ids.",
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
  input: ({ dataSourceId }) => ({ dataSourceId }),
  items: (result) => (result as { templates?: unknown[] }).templates ?? [],
  idOf: (item) => String((item as { id?: unknown }).id),
  output: [
    { key: "id", type: "string", label: "Template ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_default", type: "boolean", label: "Is default" },
  ],
  sample: {
    "id": "a5da15f6-b853-455b-8b1a-6f1e1d9c7a3e",
    "name": "Weekly report",
    "is_default": false,
  },
});
