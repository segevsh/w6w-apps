import type { ActionDefinition } from "@w6w/types";
import { asJson, requireId, SignWellClient } from "../lib/client.ts";
import { DOCUMENT_OUTPUT, idParam } from "../lib/params.ts";

/**
 * `PATCH /api/v1/documents/{id}/recipients` — verified against SignWell's OpenAPI document
 * (`updateRecipients`). Each entry requires `id` (from Get Document), `name` and `email`;
 * `subject`, `message`, `passcode` and `passcode_delivery` are optional. 409 when the document is
 * not in an eligible state, 422 on a business-rule violation.
 */
const documentUpdateRecipients: ActionDefinition = {
  key: "document-update-recipients",
  type: "perform",
  resource: "document",
  title: "Update Recipients",
  description:
    "Change a recipient's name or email (and optionally their subject, message or passcode).",
  idempotent: true,
  params: [
    idParam("Document id"),
    {
      key: "recipients",
      label: "Recipients",
      type: "json",
      required: true,
      hint: 'Array of {"id", "name", "email"} — `id` is the recipient id from Get Document. ' +
        "Optional: subject, message, passcode.",
    },
  ],
  output: [...DOCUMENT_OUTPUT],

  async execute(input, ctx) {
    const i = input as { id?: unknown; recipients?: unknown };
    const id = requireId(i.id);
    const recipients = asJson<unknown[]>(i.recipients, "recipients");
    ctx.log("info", "updating SignWell recipients", { id });
    return await new SignWellClient(ctx).request(
      `/documents/${encodeURIComponent(id)}/recipients`,
      { method: "PATCH", body: { recipients } },
    );
  },
};

export default documentUpdateRecipients;
