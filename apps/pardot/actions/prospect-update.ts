import type { ActionDefinition } from "@w6w/types";
import { idOf, PardotClient, unset } from "../lib/client.ts";
import { fieldsParam, prospectIdParam } from "../lib/params.ts";
import {
  prospectBody,
  prospectFieldParams,
  type ProspectInput,
  WRITE_DEFAULT_FIELDS,
} from "../lib/prospect.ts";

const prospectUpdate: ActionDefinition<ProspectInput & { prospectId: number }> = {
  key: "prospect-update",
  type: "perform",
  resource: "prospect",
  title: "Update Prospect",
  description: "Change fields on a prospect. Fields you leave blank are left as they are.",
  idempotent: true,
  params: [
    prospectIdParam,
    { key: "email", label: "Email", type: "string" },
    ...prospectFieldParams,
    fieldsParam(WRITE_DEFAULT_FIELDS),
  ],
  output: [{ key: "id", type: "number", label: "Prospect ID" }],

  async execute(input, ctx) {
    const id = idOf(input.prospectId, "prospectId");
    const body = prospectBody(input);
    if (Object.keys(body).length === 0) {
      throw new Error("Nothing to update — set at least one field.");
    }
    const updated = await new PardotClient(ctx).request<Record<string, unknown> | undefined>(
      `/prospects/${id}`,
      {
        method: "PATCH",
        query: { fields: unset(input.fields) ?? WRITE_DEFAULT_FIELDS },
        body,
      },
    );
    // 204: updated, but the API user cannot view the prospect after the change.
    return updated ?? { id, updated: true };
  },
};

export default prospectUpdate;
