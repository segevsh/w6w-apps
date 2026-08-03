import type { ActionDefinition } from "@w6w/types";
import { MailerLiteClient, type MailerLiteEnvelope } from "../lib/client.ts";

interface Input {
  campaignId: string;
  delivery: "instant" | "scheduled" | "timezone_based" | "smart_sending";
  date?: string;
  hours?: string;
  minutes?: string;
  timezoneId?: number;
}

/**
 * `POST /api/campaigns/{campaign_id}/schedule` — this is the SEND button.
 * `delivery: "instant"` dispatches immediately; the other three modes need the
 * `schedule` sub-object.
 *
 * The docs express the sub-fields in bracket notation (`schedule[date]`,
 * `schedule[hours]`, …), which on this Laravel-backed API is the table
 * rendering of a nested JSON object — so we send `schedule: { … }`.
 *
 * Deliberately `idempotent: false`: a second call against an already-scheduled
 * campaign is not a no-op, and an instant delivery re-run would be a second
 * send. `resend[...]` and `sending_time_test_schedule` (auto-resend and A/B
 * sending-time campaigns) are documented but not modelled here.
 */
const scheduleCampaign: ActionDefinition<Input> = {
  key: "schedule-campaign",
  type: "perform",
  resource: "campaign",
  title: "Schedule Campaign",
  description: "Send a draft campaign now, or schedule it for a future date and time.",
  idempotent: false,
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    {
      key: "delivery",
      label: "Delivery",
      type: "select",
      required: true,
      default: "instant",
      options: [
        { value: "instant", label: "Send now" },
        { value: "scheduled", label: "At a specific date and time" },
        { value: "timezone_based", label: "At a local time per subscriber timezone" },
        { value: "smart_sending", label: "Smart sending" },
      ],
    },
    {
      key: "date",
      label: "Date",
      type: "string",
      hint: "`scheduled` and `smart_sending` only. Must be in the future.",
      showIf: { in: [{ var: "delivery" }, ["scheduled", "smart_sending"]] },
    },
    {
      key: "hours",
      label: "Hours",
      type: "string",
      placeholder: "09",
      hint: "`scheduled` and `timezone_based` only. Two-digit `HH`.",
      showIf: { in: [{ var: "delivery" }, ["scheduled", "timezone_based"]] },
    },
    {
      key: "minutes",
      label: "Minutes",
      type: "string",
      placeholder: "30",
      hint: "`scheduled` and `timezone_based` only. Two-digit `ii`.",
      showIf: { in: [{ var: "delivery" }, ["scheduled", "timezone_based"]] },
    },
    {
      key: "timezoneId",
      label: "Timezone ID",
      type: "number",
      hint: "MailerLite timezone id. Defaults to the account's own timezone.",
    },
  ],
  output: [{ key: "data", type: "object", label: "Campaign" }],

  execute(input, ctx) {
    const client = new MailerLiteClient(ctx);
    const body: Record<string, unknown> = { delivery: input.delivery };

    const schedule: Record<string, unknown> = {};
    if (input.date !== undefined) schedule.date = input.date;
    if (input.hours !== undefined) schedule.hours = input.hours;
    if (input.minutes !== undefined) schedule.minutes = input.minutes;
    if (input.timezoneId !== undefined) schedule.timezone_id = input.timezoneId;
    if (Object.keys(schedule).length > 0) body.schedule = schedule;

    return client.request<MailerLiteEnvelope>(
      `/campaigns/${encodeURIComponent(input.campaignId)}/schedule`,
      { method: "POST", body },
    );
  },
};

export default scheduleCampaign;
