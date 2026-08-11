import type { ActionDefinition } from "@w6w/types";
import { asJson, encodeId, FilloutClient } from "../lib/client.ts";
import { formIdParam } from "../lib/params.ts";

/**
 * `POST /v1/api/forms/{formId}/submissions` — import responses into a form.
 *
 * ## Three documented constraints, all of which bite
 *
 * **Ten per request, maximum.** The request schema declares
 * `submissions: {type: array, maxItems: 10}`. Larger batches must be split;
 * the request is refused, not truncated.
 *
 * **Questions are addressed by id, not by name.** Each entry is
 * `{questions: [{id, value}], …}` where `id` is a question id from Get Form
 * Metadata. There is no name-based form of this call.
 *
 * **Nothing downstream fires.** Fillout's own note: "Submissions created via
 * API will not trigger email notifications, workflows, or integrations." So
 * this imports history; it does not simulate a respondent. In particular a
 * webhook created by this app's Create Webhook action will **not** receive
 * these — which is the whole reason that sentence is repeated here rather than
 * left in the vendor's docs.
 *
 * ## Not idempotent, and Fillout offers no way to make it so
 *
 * There is no idempotency key, no client-supplied submission id and no upsert
 * mode anywhere in the request schema. A retry creates a second copy of every
 * submission in the batch. Marking this `idempotent` would let the runtime turn
 * one dropped connection into a duplicated import, so it is `false` and the
 * `invocationId` is logged instead — it is the only handle a human has for
 * reconciling a partial retry afterwards.
 *
 * ## Why this action is not a `file` upload
 *
 * A form with a `FileUpload` question stores files that Fillout serves back as
 * URLs in the submission payload, and reading those is fine. *Writing* one
 * would need a multipart body carrying raw bytes, which this sandbox cannot
 * carry. Fillout's create endpoint is JSON-only in any case, so nothing is
 * lost — but a `FileUpload` question's `value` here can only be data Fillout
 * already hosts.
 */
interface Input {
  formId: string;
  submissions: unknown;
}

interface CreateBody {
  submissions: unknown[];
}

interface Output {
  submissions: unknown[];
  createdCount: number;
}

const submissionCreate: ActionDefinition<Input, Output> = {
  key: "submission-create",
  type: "perform",
  resource: "submission",
  title: "Create Submissions",
  description: "Import up to 10 submissions into a form. Does not trigger the form's " +
    "notifications, workflows or integrations.",
  idempotent: false,
  params: [
    formIdParam,
    {
      key: "submissions",
      label: "Submissions",
      type: "json",
      required: true,
      hint: 'An array of up to 10 submissions. Each is `{ "questions": [{ "id": ' +
        '"<question id>", "value": <answer> }] }`, optionally with `urlParameters`, ' +
        "`submissionTime`, `lastUpdatedAt`, `scheduling`, `payments` or `login`. Question IDs " +
        "come from Get Form Metadata.",
    },
  ],
  output: [
    { key: "submissions", type: "array", label: "Created submissions" },
    { key: "createdCount", type: "number", label: "Number created" },
  ],

  async execute(input, ctx) {
    const parsed = asJson<unknown>(input.submissions, "Submissions");
    // A single object is the shape people reach for first; the API only accepts
    // an array, so wrapping it here turns a guaranteed 400 into a working call.
    const submissions = Array.isArray(parsed) ? parsed : [parsed];
    if (submissions.length > 10) {
      throw new Error(
        `Fillout accepts at most 10 submissions per request; ${submissions.length} were supplied. ` +
          "Split the batch across several calls.",
      );
    }

    const body: CreateBody = { submissions };
    const result = await new FilloutClient(ctx).json<{ submissions?: unknown[] }>(
      `/forms/${encodeId(input.formId)}/submissions`,
      { method: "POST", body },
    );
    const created = Array.isArray(result?.submissions) ? result.submissions : [];
    ctx.log("info", "created Fillout submissions", {
      formId: input.formId,
      sent: submissions.length,
      createdCount: created.length,
      // Not an idempotency key — Fillout has none. It is the correlation handle
      // for reconciling a retry by hand.
      invocationId: ctx.invocation?.invocationId,
    });
    return { submissions: created, createdCount: created.length };
  },
};

export default submissionCreate;
