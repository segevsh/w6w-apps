import { snapshotTrigger } from "../lib/polls.ts";
import transformationList from "../actions/transformation-list.ts";

/** `GET /v1/transformations` (`transformation-list`): the dbt jobs Fivetran runs. */
const newTransformation = snapshotTrigger({
  key: "new-transformation",
  title: "New Transformation",
  description:
    "The run gets each Fivetran transformation (a dbt job or Quickstart package) newly added to the account.",
  action: transformationList,
  listKey: "transformations",
  output: [
    { key: "id", type: "string", label: "Transformation ID" },
    { key: "status", type: "string", label: "Status" },
    { key: "type", type: "string", label: "Type" },
    { key: "paused", type: "boolean", label: "Paused" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],
  sample: {
    id: "spoken_scorching",
    status: "succeeded",
    type: "DBT_CORE",
    paused: false,
    created_at: "2026-11-09T12:00:00.000000Z",
    last_started_at: "2026-11-10T08:00:00.000000Z",
    last_ended_at: "2026-11-10T08:05:00.000000Z",
  },
});

export default newTransformation;
