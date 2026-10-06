import type { ActionDefinition } from "@w6w/types";
import { call, csv, V1 } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = {
  id: string;
  campaigns_id?: string;
};

const prospectDelete: ActionDefinition<Input> = {
  key: "prospect-delete",
  type: "perform",
  resource: "prospect",
  title: "Delete Prospects",
  description:
    "Delete prospects globally, or only remove them from the given campaigns. Irreversible.",
  idempotent: true,
  params: [
    str("id", "Prospect IDs", { required: true, hint: "Comma-separated prospect IDs." }),
    str("campaigns_id", "Campaign IDs", {
      hint:
        "Comma-separated. When set, prospects are removed from these campaigns only, not deleted globally.",
    }),
  ],
  output: [
    { key: "deleted", type: "boolean", label: "True when accepted" },
    { key: "id", type: "string", label: "Prospect IDs" },
    {
      key: "campaigns_id",
      type: "string",
      label: "Campaigns the prospects were removed from, or null for a global delete",
    },
  ],

  async execute(input, ctx) {
    const ids = csv(input.id);
    if (!ids) throw new Error("id must list at least one prospect ID");
    await call(ctx, "DELETE", V1, "/prospects", {
      query: { id: ids, campaigns_id: csv(input.campaigns_id) },
    });
    return { deleted: true, id: ids, campaigns_id: csv(input.campaigns_id) ?? null };
  },
};

export default prospectDelete;
