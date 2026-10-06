import type { ActionDefinition } from "@w6w/types";
import { compact, MailerSendClient, seg } from "../lib/client.ts";

interface Input {
  domainId: string;
  sendPaused?: boolean;
  trackClicks?: boolean;
  trackOpens?: boolean;
  trackUnsubscribe?: boolean;
  trackContent?: boolean;
  customTrackingEnabled?: boolean;
  customTrackingSubdomain?: string;
  precedenceBulk?: boolean;
  ignoreDuplicatedRecipients?: boolean;
}

const flag = (key: string, label: string, hint?: string) => ({
  key,
  label,
  type: "boolean" as const,
  hint: hint ?? "Leave unset to keep the current value.",
});

const updateDomainSettings: ActionDefinition<Input> = {
  key: "update-domain-settings",
  type: "perform",
  resource: "domain",
  title: "Update Domain Settings",
  description:
    "Change a domain's sending and tracking settings (PUT /v1/domains/{id}/settings). Only the fields you set are sent. `sendPaused: true` stops all sending from the domain.",
  idempotent: true,
  params: [
    { key: "domainId", label: "Domain ID", type: "string", required: true },
    flag("sendPaused", "Pause sending"),
    flag("trackClicks", "Track clicks"),
    flag("trackOpens", "Track opens"),
    flag("trackUnsubscribe", "Track unsubscribes"),
    flag(
      "trackContent",
      "Track content",
      "Starter plan and above. Leave unset to keep the current value.",
    ),
    flag("customTrackingEnabled", "Custom tracking domain"),
    { key: "customTrackingSubdomain", label: "Custom tracking subdomain", type: "string" },
    flag("precedenceBulk", "Precedence: bulk"),
    flag("ignoreDuplicatedRecipients", "Ignore duplicated recipients"),
  ],
  output: [{ key: "data", type: "object", label: "The updated domain" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json(`/domains/${seg(input.domainId)}/settings`, {
      method: "PUT",
      body: compact({
        send_paused: input.sendPaused,
        track_clicks: input.trackClicks,
        track_opens: input.trackOpens,
        track_unsubscribe: input.trackUnsubscribe,
        track_content: input.trackContent,
        custom_tracking_enabled: input.customTrackingEnabled,
        custom_tracking_subdomain: input.customTrackingSubdomain,
        precedence_bulk: input.precedenceBulk,
        ignore_duplicated_recipients: input.ignoreDuplicatedRecipients,
      }),
    });
  },
};

export default updateDomainSettings;
