import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, stringList, V2 } from "../lib/client.ts";
import { leadOutput } from "../lib/params.ts";

interface Input {
  title: string;
  description: string;
  userId?: string;
  step?: string;
  createdAt?: string;
  tags?: unknown;
}

/**
 * `POST /api/v2/leads` — create a lead.
 *
 * Verified against the Create-a-lead section of noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22). Its parameter table is the
 * source for every field here:
 *
 *   - `title` and `description` are the two **required** ones.
 *   - `user_id` is "User's email address or id to assign the lead to the user.
 *     This parameter returns an error in case you are using the login user
 *     method to authenticate (USER token)". The document also states that a
 *     lead created with the API key and no `user_id` belongs to nobody and
 *     "will appear in the interface as an unassigned lead".
 *   - `tags` are created automatically if they do not exist.
 *   - `created_at` accepts "`YYYY-MM-DD HH:MM:SS` in the time zone of the
 *     account and the time in 24h format" or UTC as `YYYY-MM-DDTHH:MM:SS.sssZ`.
 *   - `step` "can only be set if the lead is assigned", and the document warns
 *     that a step *name* is ambiguous across pipelines, so an id is preferable.
 *
 * Not idempotent: noCRM mints a new lead id per call and the document exposes
 * no create-or-converge endpoint to retry against.
 */
const leadCreate: ActionDefinition<Input> = {
  key: "lead-create",
  type: "perform",
  resource: "lead",
  title: "Create Lead",
  description:
    "Create a lead with its title and description, optionally assigning it, tagging it and " +
    "placing it in a step (POST /api/v2/leads).",
  idempotent: false,
  params: [
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "The lead's title. The document notes it usually corresponds to the company name.",
    },
    {
      key: "description",
      label: "Description",
      type: "text",
      required: true,
      config: { multiline: true },
      hint: "The lead's description — usually the contact's details and the enquiry.",
    },
    {
      key: "userId",
      label: "Assign to",
      type: "string",
      hint: "User id or email to assign the lead to. API-key connections only — the document " +
        "states this parameter returns an error under USER-token authentication.",
    },
    {
      key: "step",
      label: "Step",
      type: "string",
      hint: "Step id or name. Prefer an id: the document warns that same-named steps in " +
        "different pipelines are ambiguous. A step can only be set if the lead is assigned.",
    },
    {
      key: "createdAt",
      label: "Created at",
      type: "string",
      advanced: true,
      hint: "`YYYY-MM-DD HH:MM:SS` in the account's time zone, or `YYYY-MM-DDTHH:MM:SS.sssZ` in " +
        "UTC. Leave unset to keep the current time.",
    },
    {
      key: "tags",
      label: "Tags",
      type: "array",
      item: { type: "string", placeholder: "prospect" },
      advanced: true,
      hint: "Tags to attach. They are created automatically if they do not exist.",
    },
  ],
  output: leadOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/leads`, {
      method: "POST",
      body: {
        title: input.title,
        description: input.description,
        user_id: input.userId,
        step: input.step,
        created_at: input.createdAt,
        tags: stringList(input.tags),
      },
    });
  },
};

export default leadCreate;
