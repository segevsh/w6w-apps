import type { TriggerDefinition } from "@w6w/types";
import { driveIdParam } from "../lib/params.ts";
import { type PermissionParams, pollPermissions } from "../lib/triggers.ts";

const trigger: TriggerDefinition<PermissionParams, Record<string, unknown>> = {
  key: "new-permission",
  title: "New Permission",
  description:
    "The run gets a sharing permission (a link, an invite or an inherited grant) newly added to one file or folder.",
  params: [
    {
      key: "itemId",
      label: "Item ID",
      type: "string",
      required: true,
      placeholder: "01CYZLFJGUJ7JHBSZDFZFL25KSZGQTVAUN",
      hint: "driveItem id of the file or folder to watch, as List Children returns it.",
    },
    driveIdParam,
  ],
  output: [
    { key: "id", type: "string", label: "Permission ID" },
    { key: "roles", type: "array", label: "Roles" },
    { key: "link", type: "object", label: "Sharing link" },
    { key: "grantedToV2", type: "object", label: "Granted to" },
    { key: "inheritedFrom", type: "object", label: "Inherited from" },
  ],
  sample: {
    id: "aTowIy5mfG1lbWJlcnNoaXA",
    roles: ["read"],
    link: { type: "view", scope: "anonymous" },
  },
  minIntervalMs: 300_000,
  poll: ({ params, state }, ctx) => pollPermissions({ params, state, ctx }),
};

export default trigger;
