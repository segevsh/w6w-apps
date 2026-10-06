import { listAction } from "../lib/actions.ts";

export default listAction({
  "key": "opportunity-pipelines-list",
  "noun": "opportunity pipelines",
  "path": "/opportunities/pipelines",
  "scope": "opportunities.read",
  "orders": [
    "id",
    "rank",
  ],
});
