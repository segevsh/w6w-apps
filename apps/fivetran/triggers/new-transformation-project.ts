import { snapshotTrigger } from "../lib/polls.ts";
import transformationProjectList from "../actions/transformation-project-list.ts";

/** `GET /v1/transformation-projects` (`transformation-project-list`): the dbt repositories. */
const newTransformationProject = snapshotTrigger({
  key: "new-transformation-project",
  title: "New Transformation Project",
  description:
    "The run gets each Fivetran transformation project (a dbt repository) newly added to the account.",
  action: transformationProjectList,
  listKey: "projects",
  output: [
    { key: "id", type: "string", label: "Project ID" },
    { key: "group_id", type: "string", label: "Destination (group) ID" },
    { key: "type", type: "string", label: "Project type" },
    { key: "created_at", type: "string", label: "Created at (ISO 8601)" },
  ],
  sample: {
    id: "dull_adaptive",
    group_id: "projected_sickle",
    type: "DBT_GIT",
    created_at: "2026-11-09T12:00:00.000000Z",
    created_by_id: "recast_kinase",
  },
});

export default newTransformationProject;
