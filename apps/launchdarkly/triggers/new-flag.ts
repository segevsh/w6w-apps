import { pollFromListAction } from "../../_shared/poll/mod.ts";
import flagList from "../actions/flag-list.ts";

/**
 * `GET /flags/{projectKey}?sort=-creationDate` — LaunchDarkly documents `creationDate` as a sort
 * field and a leading dash as descending, so page 1 is the newest flags.
 */
export default pollFromListAction<{ projectKey?: string }>({
  key: "new-flag",
  title: "New Feature Flag",
  description: "The run gets each feature flag newly created in a project.",
  action: flagList,
  params: [{
    key: "projectKey",
    label: "Project",
    type: "string",
    default: "",
    placeholder: "default",
    hint: "Falls back to the connection's default project when blank.",
  }],
  input: (params) => ({
    projectKey: params.projectKey,
    sort: "-creationDate",
    summary: true,
    limit: 100,
  }),
  items: (result) => Array.isArray(result) ? result : [],
  idOf: (item) => String((item as { key?: unknown }).key ?? ""),
  output: [
    { key: "key", type: "string", label: "Flag key" },
    { key: "name", type: "string", label: "Flag name" },
    { key: "kind", type: "string", label: "Flag kind" },
    { key: "creationDate", type: "number", label: "Created (epoch ms)" },
  ],
  sample: {
    key: "new-checkout",
    name: "New checkout",
    kind: "boolean",
    creationDate: 1762689600000,
  },
  maxPages: 1,
});
