import type { ActionDefinition } from "@w6w/types";
import { LemlistClient } from "../lib/client.ts";

interface Input {
  email: string;
  version?: "v2";
}

/**
 * `GET /leads/{email}?version=v2`.
 *
 * ## `version=v2` is mandatory here
 *
 * lemlist's page carries an explicit Warning: "You must set the mandatory query
 * parameter *version* to `version=v2`." The OpenAPI schema marks it
 * `default: v2` with `v2` as the only enum member. This action therefore sends
 * it unconditionally — the param exists for visibility, not to be turned off,
 * and `?? "v2"` means clearing it still sends `v2` rather than producing a
 * request lemlist rejects.
 *
 * ## It returns an ARRAY
 *
 * One email can be a lead in several campaigns, so the response is a list of
 * lead records — each with its own `campaign` block, `state` and `status` —
 * not a single object. The sibling `GET /leads?email=` route returns a single
 * flattened object instead; this one is the richer, campaign-aware view.
 *
 * lemlist's documented lead `status` vocabulary: `notInterested`, `interested`,
 * `unsubscribed`, `review` (to launch), `scanning` (enriching), `running` (in
 * progress), `paused`, `done`.
 */
const getLead: ActionDefinition<Input> = {
  key: "get-lead",
  type: "read",
  resource: "lead",
  title: "Get Lead by Email",
  description:
    "Look a lead up by email. Returns one record per campaign the address belongs to, each with its own state, status and variables.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "john.doe@example.com",
    },
    {
      key: "version",
      label: "API version",
      type: "select",
      options: [{ value: "v2", label: "v2" }],
      default: "v2",
      hint: "lemlist documents `version=v2` as MANDATORY on this route. Leave it alone.",
    },
  ],
  output: [{ key: "leads", type: "array", label: "Lead records, one per campaign" }],

  execute(input, ctx) {
    return new LemlistClient(ctx).request<unknown[]>(
      `/leads/${encodeURIComponent(input.email)}`,
      { query: { version: input.version ?? "v2" } },
    );
  },
};

export default getLead;
