import type { ActionDefinition } from "@w6w/types";
import { NocrmClient, V2 } from "../lib/client.ts";
import { webhookEventNames, webhookOutput, webhookTargetTypeOptions } from "../lib/params.ts";

interface Input {
  event: string;
  targetType: string;
  target: string;
  name?: string;
}

/**
 * `POST /api/v2/webhooks` — create a webhook or an email notification.
 *
 * Verified against the Create-a-webhook table in noCRM's API document
 * (<https://www.nocrm.io/api>, read 2026-09-22): `event`, `target_type` and
 * `target` are required; `name` is optional. Its code sample also shows the
 * three required fields in the request body, which is why `name` is declared
 * without a default.
 *
 * `event` is a free string rather than a `select`: the document's "List of
 * events" section states that which events an account may subscribe to
 * "depend[s] on your edition", and one of the advanced names —
 * `lead.step.changed.to.PIPE.NAME_OF_YOUR_STEP` — embeds the caller's own
 * pipeline and step names, so a closed list would be wrong. The documented
 * non-parameterised names are attached as a hint.
 *
 * The document also states the uniqueness rule that makes this action safe to
 * retry: "A webhook with the same event, target_type and target is uniq in your
 * account. In case of creating a webhook that already exists a status code 409
 * is returned with the id of the existing webhook." A retry therefore cannot
 * create a duplicate.
 *
 * The table's `add_to_lead_action_menu` row (only meaningful for
 * `lead.manual.trigger`) is not exposed — the reviewed surface is the three
 * required fields plus the name the sample shows.
 */
const webhookCreate: ActionDefinition<Input> = {
  key: "webhook-create",
  type: "perform",
  resource: "webhook",
  title: "Create Webhook",
  description: "Subscribe a URL or an email address to a noCRM event (POST /api/v2/webhooks).",
  idempotent: true,
  params: [
    {
      key: "event",
      label: "Event",
      type: "string",
      required: true,
      placeholder: "lead.creation",
      hint: "The event name to subscribe. Documented non-parameterised names: " +
        webhookEventNames.join(", ") + ". Advanced events depend on your edition, and the " +
        "`lead.step.changed.to.<pipeline>.<step>` form embeds your own step name.",
    },
    {
      key: "targetType",
      label: "Target type",
      type: "select",
      required: true,
      default: "url",
      options: webhookTargetTypeOptions,
      hint: "`url` creates a webhook; `email` creates a notification.",
    },
    {
      key: "target",
      label: "Target",
      type: "string",
      required: true,
      hint: "A URL when the target type is `url`, an email address when it is `email`.",
    },
    { key: "name", label: "Name", type: "string", advanced: true },
  ],
  output: webhookOutput,

  execute(input, ctx) {
    return new NocrmClient(ctx).request(`${V2}/webhooks`, {
      method: "POST",
      body: {
        event: input.event,
        target_type: input.targetType,
        target: input.target,
        name: input.name,
      },
    });
  },
};

export default webhookCreate;
