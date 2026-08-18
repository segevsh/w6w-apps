import type { ActionDefinition } from "@w6w/types";
import { compact, idempotencyHeader, json, LoopsClient } from "../lib/client.ts";
import { IDEMPOTENCY_PARAM } from "../lib/params.ts";

/**
 * `POST /v1/transactional` — verified against Loops' OpenAPI document
 * (required `email` and `transactionalId`).
 *
 * **The email body lives in Loops, not here.** `transactionalId` names a
 * template built in the Loops editor; this action supplies the address and the
 * variables it interpolates. There is no way to send arbitrary HTML through
 * this endpoint, which is the whole design — the template is versioned and
 * previewable in Loops rather than embedded in a workflow.
 *
 * **A template must be published.** An unpublished transactional email exists,
 * has an id, and returns `404` here. `transactional-publish` is the step
 * between the two, and it is easy to forget after editing.
 *
 * **`dataVariables` is checked against the template.** Loops rejects a send
 * whose variables do not match what the template declares, rather than
 * rendering a blank — so a renamed variable is a failed send, not a silently
 * empty paragraph.
 */
const action: ActionDefinition = {
  key: "transactional-send",
  type: "perform",
  resource: "transactional",
  title: "Send a transactional email",
  description: "Send a published transactional template to one address.",
  // Two calls send two emails unless the idempotency key is used — see the param.
  idempotent: false,
  params: [
    {
      key: "transactionalId",
      label: "Transactional ID",
      type: "string",
      required: true,
      default: "",
      hint: "The template's id from Loops. It must be PUBLISHED — an unpublished one 404s.",
    },
    {
      key: "email",
      label: "To",
      type: "string",
      required: true,
      default: "",
      placeholder: "ada@example.com",
    },
    {
      key: "dataVariables",
      label: "Data Variables",
      type: "json",
      default: "",
      placeholder: '{"firstName":"Ada","orderId":"1234"}',
      hint: "Must match the variables the template declares — Loops rejects a mismatch rather " +
        "than rendering it blank.",
    },
    {
      key: "addToAudience",
      label: "Add To Audience",
      type: "boolean",
      default: false,
      hint: "Create a contact for this address if there is not one. Off, a transactional send " +
        "does not grow your audience.",
    },
    {
      key: "attachments",
      label: "Attachments",
      type: "json",
      default: "",
      placeholder: '[{"filename":"receipt.pdf","contentType":"application/pdf","data":"<base64>"}]',
      hint: "Base64 content. Attachments must be enabled for the workspace.",
    },
    IDEMPOTENCY_PARAM,
  ],
  output: [
    { key: "success", type: "boolean", label: "Accepted by Loops" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const transactionalId = String(p.transactionalId ?? "").trim();
    if (!transactionalId) throw new Error("`transactionalId` is required");
    const email = String(p.email ?? "").trim();
    if (!email) throw new Error("`email` is required");

    const body = compact({
      transactionalId,
      email,
      dataVariables: json(p.dataVariables, "dataVariables"),
      attachments: json(p.attachments, "attachments"),
      addToAudience: p.addToAudience === true || undefined,
    });

    const headers = idempotencyHeader(ctx, p.useInvocationIdempotencyKey);
    ctx.log("info", "sending a Loops transactional email", {
      transactionalId,
      idempotent: Boolean(headers),
    });

    return await new LoopsClient(ctx).request("/transactional", {
      method: "POST",
      body,
      headers,
    });
  },
};

export default action;
