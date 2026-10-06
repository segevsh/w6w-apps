import type { ActionDefinition } from "@w6w/types";
import { call, encodeId, parseJsonField, pick, V2 } from "../lib/client.ts";
import { bool, campaignId, int, json, select, str } from "../lib/params.ts";

const SETTING_KEYS = [
  "timezone",
  "prospect_timezone",
  "daily_enroll",
  "gdpr_unsubscribe",
  "list_unsubscribe",
  "open_disabled_list",
  "auto_pause_prospect_from_domain_statuses",
  "catch_all_verification_mode",
  "count_followup_delay_in_working_days",
] as const;

type Input = {
  campaign_id: string;
  name?: string;
  email_account_ids?: number[] | string;
  timezone?: string;
  prospect_timezone?: boolean;
  daily_enroll?: number;
  gdpr_unsubscribe?: boolean;
  list_unsubscribe?: boolean;
  open_disabled_list?: string[] | string;
  auto_pause_prospect_from_domain_statuses?: string[] | string;
  catch_all_verification_mode?: string;
  count_followup_delay_in_working_days?: boolean;
};

const campaignUpdate: ActionDefinition<Input> = {
  key: "campaign-update",
  type: "perform",
  resource: "campaign",
  title: "Update Campaign Settings",
  description:
    "Partially update a campaign's name, attached mailboxes and settings. Only fields you set are sent.",
  idempotent: true,
  params: [
    campaignId,
    str("name", "Name"),
    json("email_account_ids", "Mailbox IDs", {
      hint: "JSON array of SMTP mailbox IDs (see List Mailboxes). Replaces the attached set.",
    }),
    str("timezone", "Timezone", { hint: "IANA timezone, for example Europe/Warsaw." }),
    bool("prospect_timezone", "Use prospect timezone"),
    int("daily_enroll", "Daily enroll limit", {
      hint: "Prospects contacted in the first step per day, per mailbox. Maximum 500.",
    }),
    bool("gdpr_unsubscribe", "GDPR unsubscribe"),
    bool("list_unsubscribe", "List-Unsubscribe header"),
    json("open_disabled_list", "Open tracking disabled for", {
      hint: "JSON array of: google.com, outlook.com, OTHER_PROVIDER.",
    }),
    json("auto_pause_prospect_from_domain_statuses", "Same-domain auto-pause statuses", {
      hint: "JSON array of REPLIED and/or BOUNCED.",
    }),
    select("catch_all_verification_mode", "Catch-all mode", [
      "NONE",
      "BALANCED",
      "MAXIMUM",
      "ONLY_VERIFY",
    ]),
    bool("count_followup_delay_in_working_days", "Count follow-up delay in working days"),
  ],
  output: [
    { key: "id", type: "number", label: "Campaign ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "settings", type: "object", label: "Settings after the update" },
  ],

  async execute(input, ctx) {
    const settings = pick(
      {
        ...input,
        open_disabled_list: parseJsonField("open_disabled_list", input.open_disabled_list),
        auto_pause_prospect_from_domain_statuses: parseJsonField(
          "auto_pause_prospect_from_domain_statuses",
          input.auto_pause_prospect_from_domain_statuses,
        ),
      },
      SETTING_KEYS,
    );
    const body: Record<string, unknown> = pick(input, ["name"]);
    const mailboxes = parseJsonField("email_account_ids", input.email_account_ids);
    if (mailboxes !== undefined && mailboxes !== "") body.email_account_ids = mailboxes;
    if (Object.keys(settings).length > 0) body.settings = settings;
    return (await call(ctx, "PATCH", V2, `/campaigns/${encodeId(input.campaign_id)}`, {
      body,
    })) as Record<string, unknown>;
  },
};

export default campaignUpdate;
