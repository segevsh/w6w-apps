import { pollFromListAction } from "../../_shared/poll/mod.ts";
import type { ActionDefinition } from "@w6w/types";
import action from "../actions/list-package-instances.ts";

/** `GET /consultant/packages/instances`: "Packages are returned in descending order, with the most recent packages appearing first." (https://api-docs.practicebetter.io/swagger.json, verified 2026-11-10). */
export default pollFromListAction({
  key: "new-package-instance",
  title: "New Package Instance",
  description: "The run gets each newly created package a client purchased.",
  action: action as unknown as ActionDefinition,
  input: () => ({ limit: 100 }),
  items: (result) => (result as { items?: unknown[] }).items ?? [],
  idOf: (item) => String((item as { id?: unknown }).id ?? ""),
  output: [
    {
      "key": "id",
      "type": "string",
      "label": "Package instance ID",
    },
    {
      "key": "dateCreated",
      "type": "string",
      "label": "Created at",
    },
    {
      "key": "expired",
      "type": "boolean",
      "label": "Expired",
    },
  ],
  sample: {
    "id": "pkg-inst-1",
    "dateCreated": "2026-11-10T09:00:00Z",
    "expired": false,
  },
  maxPages: 1,
});
