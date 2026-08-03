import type { ActionDefinition } from "@w6w/types";
import { JobberClient, optionalInput, unwrap, VISIT_FIELDS } from "../lib/client.ts";

interface Input {
  visitId: string;
  completedAt?: string;
}

const MUTATION = `
  mutation CompleteVisit($visitId: EncodedId!, $input: VisitCompleteInput) {
    visitComplete(visitId: $visitId, input: $input) {
      visit { ${VISIT_FIELDS} }
      userErrors { message path }
    }
  }
`;

/**
 * Mark a visit done — the event most downstream automation hangs off, because
 * a job billed `PER_VISIT` becomes invoiceable when its visits complete, and
 * `invoice-create-from-job` is what turns that into money.
 *
 * `completedAt` defaults to now, per Jobber. It is exposed because backdating
 * matters when a workflow is catching up on work that was logged on paper.
 *
 * Idempotent: completing an already-complete visit does not double-anything.
 * `visitUncomplete` exists and is deliberately not shipped — undoing completion
 * unwinds billing state and should be a decision, not a retry.
 */
const visitComplete: ActionDefinition<Input> = {
  key: "visit-complete",
  type: "perform",
  resource: "visit",
  title: "Complete Visit",
  description:
    "Mark a visit complete. Defaults to the current time; set a completion timestamp to backdate it.",
  idempotent: true,
  params: [
    { key: "visitId", label: "Visit ID", type: "string", required: true },
    {
      key: "completedAt",
      label: "Completed at",
      type: "datetime",
      hint: "ISO 8601. Jobber uses the current time when omitted.",
    },
  ],
  output: [{ key: "visit", type: "object", label: "The completed visit" }],

  async execute(input, ctx) {
    const data = await new JobberClient(ctx).query<Record<string, unknown>>(MUTATION, {
      visitId: input.visitId,
      input: optionalInput({ completedAt: input.completedAt }),
    });
    return unwrap(data, "visitComplete");
  },
};

export default visitComplete;
