import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  leadId: string;
}

/**
 * `POST /leads/start/{leadId}` — lemlist's "Resume Paused Lead".
 *
 * ## `start`, not `resume` — and it is NOT the same as `/leads/review/{leadId}`
 *
 * Two nearby routes are easy to confuse, and they do different things:
 *
 *   - `POST /leads/start/{leadId}` — "Resume Paused Lead". Undoes a pause. This
 *     action.
 *   - `POST /leads/review/{leadId}` — "Launch Lead". Launches a lead that is
 *     *waiting for review*, bypassing campaign-wide auto-review. It enforces
 *     other launch guards (no step errors, valid AI variables, a sender
 *     available) and **requires an `emailPro` plan or higher**.
 *
 * A paused lead is resumed with `start`; a lead sitting in `review` status is
 * launched with `review`. This app ships the former because it is the
 * counterpart to Pause Lead and carries no plan requirement. Launch Lead is
 * deliberately not shipped — it would 4xx for anyone below emailPro, which is a
 * bad default for a pack action.
 */
const resumeLead: ActionDefinition<Input> = {
  key: "resume-lead",
  type: "perform",
  resource: "lead",
  title: "Resume Paused Lead",
  description:
    "Resume a lead that was paused, so the sequence continues. The counterpart to Pause Lead.",
  idempotent: true,
  params: [
    {
      key: "leadId",
      label: "Lead id",
      type: "string",
      required: true,
      placeholder: "lea_8xJSc7sV7ggpiVnXe",
    },
  ],
  output: [{ key: "leads", type: "array", label: "Updated lead records" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request(
      `/leads/start/${encodeURIComponent(input.leadId)}`,
      { method: "POST" },
    );
  },
};

export default resumeLead;
