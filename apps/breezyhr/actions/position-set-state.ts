import type { ActionDefinition } from "@w6w/types";
import { BreezyClient, position } from "../lib/client.ts";
import { companyIdParam, positionIdParam } from "../lib/params.ts";

interface Input {
  companyId: string;
  positionId: string;
  state: string;
}

/** `PUT /company/{id}/position/{id}/state` — 204. Publishing 400s once the active-position limit is hit. */
const positionSetState: ActionDefinition<Input> = {
  key: "position-set-state",
  type: "perform",
  resource: "position",
  title: "Set Position State",
  description:
    "Publish, unpublish (draft), archive or close a position. Publishing fails when the company is at its active-position limit.",
  idempotent: true,
  params: [
    companyIdParam,
    positionIdParam,
    {
      key: "state",
      label: "State",
      type: "select",
      required: true,
      options: [
        { value: "published", label: "Published" },
        { value: "draft", label: "Draft" },
        { value: "archived", label: "Archived" },
        { value: "closed", label: "Closed" },
      ],
    },
  ],
  output: [
    { key: "ok", type: "boolean", label: "Whether Breezy accepted the change" },
    { key: "state", type: "string", label: "The state that was set" },
  ],

  async execute(input, ctx) {
    await new BreezyClient(ctx).request(
      "PUT",
      `${position(input.companyId, input.positionId)}/state`,
      { body: { state: input.state } },
    );
    return { ok: true, state: input.state };
  },
};

export default positionSetState;
