import type { ActionDefinition } from "@w6w/types";
import { ElasticClient, encodeId } from "../lib/client.ts";

type Input = Record<string, unknown>;

/** `DELETE /v4/contacts/{email}` — answers `200` with an empty body. */
const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Contact",
  description: "Permanently delete a contact by email address.",
  idempotent: true,
  params: [{ key: "email", label: "Email", type: "string", required: true }],
  output: [
    { key: "deleted", type: "boolean", label: "Deleted" },
    { key: "email", type: "string", label: "Email" },
  ],
  async execute(input, ctx) {
    const email = String(input.email ?? "").trim();
    if (!email) throw new Error("Email is required");
    await new ElasticClient(ctx).json(`/contacts/${encodeId(email)}`, { method: "DELETE" });
    return { deleted: true, email };
  },
};

export default contactDelete;
