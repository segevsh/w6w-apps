import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";
import { INTEGRATION_TYPES } from "./sources-list.ts";

interface Input {
  referrerUrl: string;
  sessionId?: string;
  previousUrl?: string;
  userAgent?: string;
  ip?: string;
  sourceLinkTag?: string;
  isOrganic?: boolean;
  integrationType?: string;
  adSourceId?: string;
  adspendAdId?: string;
  adSourceClickId?: string;
  email?: string;
  phones?: string;
  tag?: string;
  date?: string;
}

const clickCreate: ActionDefinition<Input> = {
  key: "click-create",
  type: "perform",
  resource: "click",
  title: "Create Click",
  description:
    "Record a click (server-side tracking) so a lead's later sales attribute to the ad it came from.",
  idempotent: false,
  params: [
    { key: "referrerUrl", label: "Clicked URL", type: "string", required: true },
    {
      key: "sessionId",
      label: "Session ID",
      type: "string",
      hint: "Unique per lead/session; ties clicks to a lead.",
    },
    { key: "previousUrl", label: "Previous URL", type: "string" },
    { key: "userAgent", label: "User agent", type: "string" },
    { key: "ip", label: "IP address", type: "string", hint: "Strongly improves lead matching." },
    {
      key: "sourceLinkTag",
      label: "Source tag",
      type: "string",
      hint: "An @tag for the ad (usually organic); created if new.",
    },
    { key: "isOrganic", label: "Organic", type: "boolean" },
    {
      key: "integrationType",
      label: "Ad platform",
      type: "select",
      options: INTEGRATION_TYPES.map((v) => ({ value: v, label: v })),
    },
    {
      key: "adSourceId",
      label: "Ad source ID",
      type: "string",
      hint:
        "Facebook ad set, Google/LinkedIn campaign, TikTok ad group, Snapchat ad squad id. Required with a platform.",
    },
    { key: "adspendAdId", label: "Ad ID", type: "string", hint: "Facebook and Google only." },
    { key: "adSourceClickId", label: "Platform click ID", type: "string" },
    { key: "email", label: "Email", type: "string", hint: "Creates the lead." },
    { key: "phones", label: "Phones", type: "string", hint: "Comma-separated." },
    { key: "tag", label: "Lead tag", type: "string" },
    { key: "date", label: "Click date", type: "string", hint: "ISO 8601 / yyyy-MM-dd." },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    if (input.integrationType && !input.adSourceId) {
      throw new Error("adSourceId is required when an ad platform is given.");
    }
    const phones = csv(input.phones);
    return new HyrosClient(ctx).write("POST", "/clicks", {
      body: compact({
        referrerUrl: input.referrerUrl,
        sessionId: input.sessionId,
        previousUrl: input.previousUrl,
        userAgent: input.userAgent,
        ip: input.ip,
        sourceLinkTag: input.sourceLinkTag,
        isOrganic: input.isOrganic,
        integrationType: input.integrationType,
        adSourceId: input.adSourceId,
        adspendAdId: input.adspendAdId,
        adSourceClickId: input.adSourceClickId,
        email: input.email,
        phones: phones.length ? phones : undefined,
        tag: input.tag,
        date: input.date,
      }),
    });
  },
};

export default clickCreate;
