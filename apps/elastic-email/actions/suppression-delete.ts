import type { ActionDefinition } from "@w6w/types";
import { ElasticClient, encodeId } from "../lib/client.ts";

type Input = Record<string, unknown>;

/** `DELETE /v4/suppressions/{email}` — answers `200` with an empty body. */
const suppressionDelete: ActionDefinition<Input> = {
  key: "suppression-delete",
  type: "perform",
  resource: "suppression",
  title: "Delete Suppression",
  description: "Remove an address from the suppression list so it can be mailed again.",
  idempotent: true,
  params: [{ key: "email", label: "Email", type: "string", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "email", type: "string", label: "Email" },
  ],
  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("Email is required");
    await new ElasticClient(ctx).json(`/suppressions/${encodeId(email)}`, { method: "DELETE" });
    return { deleted: true, email };
  },
};

export default suppressionDelete;
