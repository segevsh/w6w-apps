import type { ActionDefinition } from "@w6w/types";
import { encodeId, UpsalesClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `DELETE /api/v2/projects/{id}` — Delete a campaign. Upsales answers `{"error": null}`. */
interface Input {
  id: number;
}

const campaignDelete: ActionDefinition<Input> = {
  key: "campaign-delete",
  type: "perform",
  resource: "campaign",
  title: "Delete Campaign",
  description: "Delete a campaign.",
  idempotent: true,
  params: [idParam("id", "Campaign ID")],
  output: [
    { key: "deleted", type: "boolean", label: "True when Upsales accepted the delete" },
    { key: "id", type: "number", label: "The deleted record's ID" },
  ],

  async execute(input, ctx) {
    await new UpsalesClient(ctx).data("DELETE", `/projects/${encodeId(input.id)}`);
    return { deleted: true, id: input.id };
  },
};

export default campaignDelete;
