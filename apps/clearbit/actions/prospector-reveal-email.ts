import type { ActionDefinition } from "@w6w/types";
import { ClearbitClient, PROSPECTOR_HOST } from "../lib/client.ts";

interface Input {
  personId: string;
}

/**
 * `GET prospector.clearbit.com/v1/people/{id}/email` — reveals the verified
 * email address (and verification status) for a prospect previously found by
 * `prospector-search`. `personId` is the `id` field on one of that action's
 * `results` entries, not an email or name.
 *
 * Confirmed against the official `clearbit-node` SDK (`src/prospector.js`,
 * `Prospector#getEmailResponse`: `this.constructor.get('/people/' + this.id +
 * '/email')`) and its test suite (`test/prospector.js`), which pins the
 * response shape: `{email, verified}`.
 */
const action: ActionDefinition<Input> = {
  key: "prospector-reveal-email",
  type: "read",
  resource: "prospect",
  title: "Reveal Prospect Email",
  description: "Reveal the verified email address for a prospect found via Search Prospects.",
  params: [
    { key: "personId", label: "Prospect ID", type: "string", required: true },
  ],
  output: [
    { key: "email", type: "string", label: "Email" },
    { key: "verified", type: "boolean", label: "Verified" },
  ],

  async execute(input, ctx) {
    const personId = (input.personId ?? "").trim();
    if (!personId) throw new Error("`personId` is required");
    const client = new ClearbitClient(ctx);
    return await client.request(
      PROSPECTOR_HOST,
      `/v1/people/${encodeURIComponent(personId)}/email`,
    );
  },
};

export default action;
