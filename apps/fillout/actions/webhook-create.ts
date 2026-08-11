import type { ActionDefinition } from "@w6w/types";
import { FilloutClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

/**
 * `POST /v1/api/webhook/create` — subscribe a URL to a form's submissions.
 *
 * Note the route shape: it is a flat `/webhook/create`, with the form id in the
 * **body**, not `/forms/{formId}/webhooks`. Fillout's webhook pair is the one
 * part of this API that is not resource-oriented.
 *
 * Deliveries arrive "in the same format as the entries in the `responses` list
 * from the `/submissions` endpoint" — i.e. one `Submission` object per POST, so
 * a receiver can be written against the shape Get Submissions already returns.
 *
 * ## The id type flips between the two endpoints
 *
 * This endpoint answers `{"id": <integer>}`. Its counterpart, Remove Webhook,
 * declares `webhookId` as a **string**. Both are the vendor's own schemas, and
 * the mismatch is real, not a transcription error — so this action returns
 * `webhookId` already stringified alongside the raw `id`, and Remove Webhook
 * accepts either. Handing the integer straight back is the obvious thing to do
 * and is exactly what the delete schema rejects.
 *
 * `idempotent: false` — there is no dedupe on the URL. Calling this twice with
 * the same form and URL yields two subscriptions and therefore two POSTs per
 * submission, which is worse than a failed retry.
 */
interface Input {
  formId: string;
  url: string;
}

interface Output {
  id: number | string | undefined;
  webhookId: string | undefined;
}

const webhookCreate: ActionDefinition<Input, Output> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe an endpoint to a form's submissions.",
  idempotent: false,
  params: [
    formIdParam,
    {
      key: "url",
      label: "Webhook URL",
      type: "string",
      required: true,
      placeholder: "https://example.com/hooks/fillout",
      hint: "Where Fillout should POST each submission. It receives one submission per request, " +
        "in the same shape as a row of Get Submissions.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Webhook ID as returned (integer)" },
    { key: "webhookId", type: "string", label: "Webhook ID as Remove Webhook expects it" },
  ],

  async execute(input, ctx) {
    const result = await new FilloutClient(ctx).json<{ id?: number | string }>(
      "/webhook/create",
      { method: "POST", body: { formId: input.formId, url: input.url } },
    );
    const id = result?.id;
    ctx.log("info", "created Fillout webhook", { formId: input.formId, webhookId: id });
    return { id, webhookId: id === undefined || id === null ? undefined : String(id) };
  },
};

export default webhookCreate;
