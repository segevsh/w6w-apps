import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-services.ts";
import { snapshotTrigger } from "../lib/triggers.ts";

/** `GET /consultant/services`: "Returns a list of services, ordered by rank." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10), so no newest-first window exists; the catalogue is small, so each check diffs it whole. */
export default snapshotTrigger({
  key: "new-service",
  title: "New Service",
  description:
    "The run gets each bookable service that appears in the practice, found by diffing the whole `list-services` listing between checks.",
  action: action as unknown as ActionDefinition,
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Service ID",
    },
    {
      "key": "name",
      "type": "string",
      "label": "Service name",
    },
    {
      "key": "duration",
      "type": "number",
      "label": "Duration (minutes)",
    },
  ],
  sample: {
    "id": "svc-1",
    "name": "Initial consultation",
    "duration": 60,
  },
});
