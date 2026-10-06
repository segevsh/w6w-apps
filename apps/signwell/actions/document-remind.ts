import type { ActionDefinition } from "@w6w/types";
import { asJsonOptional, requireId, SignWellClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `POST /api/v1/documents/{id}/remind` — verified against SignWell's OpenAPI document
 * (`sendReminder`). `recipients` is optional (omit to remind everyone who has not signed); each
 * entry matches by `email`, or by `name` for an SMS-only recipient. 422 when the document is in
 * a status that cannot be reminded. The documented 201 example is the document itself, so the
 * response is returned as the vendor sent it.
 */
const documentRemind: ActionDefinition = {
  key: "document-remind",
  type: "perform",
  resource: "document",
  title: "Send a Reminder",
  description: "Remind the recipients who have not yet signed a document.",
  idempotent: false,
  params: [
    idParam("Document id"),
    {
      key: "recipients",
      label: "Recipients to remind",
      type: "json",
      hint: 'Optional array of {"email"} or {"name"} (name alone for SMS-only recipients). ' +
        "Omit to remind everyone who has not signed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Document id" },
    { key: "status", type: "string", label: "Document status" },
    { key: "recipients", type: "array", label: "Recipients" },
  ],

  async execute(input, ctx) {
    const i = input as { id?: unknown; recipients?: unknown };
    const id = requireId(i.id);
    const recipients = asJsonOptional<unknown[]>(i.recipients, "recipients");
    ctx.log("info", "reminding SignWell recipients", { id });
    return await new SignWellClient(ctx).request(`/documents/${encodeURIComponent(id)}/remind`, {
      method: "POST",
      body: recipients ? { recipients } : {},
    });
  },
};

export default documentRemind;
