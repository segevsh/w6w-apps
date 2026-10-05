import type { ActionDefinition } from "@w6w/types";
import { DrataClient, seg, toList } from "../lib/client.ts";
import { expandParam } from "../lib/params.ts";

/**
 * `GET /personnel/{personnelId}` — Read one personnel record.
 */
interface Input {
  personnelId: string;
  expand?: string[] | string;
}

const action: ActionDefinition<Input> = {
  key: "personnel-get",
  type: "read",
  resource: "personnel",
  title: "Get Personnel",
  description: "Read one personnel record.",
  params: [
    {
      key: "personnelId",
      label: "Personnel ID",
      type: "string",
      required: true,
      hint: "Numeric id, or `email:` followed by the user's email address.",
    },
    expandParam(["customFields", "complianceChecks", "reasonProvider", "user"]),
  ],
  output: [
    { key: "id", type: "number", label: "Personnel ID" },
    { key: "employmentStatus", type: "string", label: "Employment status" },
    { key: "complianceChecks", type: "array", label: "Compliance checks (with Expand)" },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).get(`/personnel/${seg(input.personnelId)}`, {
      "expand[]": toList(input.expand),
    });
  },
};

export default action;
