import type { ActionDefinition } from "@w6w/types";
import { compact, csv, HyrosClient } from "../lib/client.ts";

interface Input {
  findEmail?: string;
  findId?: string;
  findPhone?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  tags?: string;
  leadIps?: string;
  phoneNumbers?: string;
  adOptimizationConsent?: string;
  stageName?: string;
  stageDate?: string;
}

const leadUpdate: ActionDefinition<Input> = {
  key: "lead-update",
  type: "perform",
  resource: "lead",
  title: "Update Lead",
  description: "Update an existing lead, found by email, id or phone, and apply tags or a stage.",
  idempotent: true,
  params: [
    { key: "findEmail", label: "Find by email", type: "string" },
    { key: "findId", label: "Find by lead ID", type: "string" },
    { key: "findPhone", label: "Find by phone", type: "string", hint: "Give at least one finder." },
    { key: "email", label: "New email", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tags to apply." },
    { key: "leadIps", label: "IP addresses", type: "string", hint: "Comma-separated." },
    { key: "phoneNumbers", label: "Phone numbers", type: "string", hint: "Comma-separated." },
    {
      key: "adOptimizationConsent",
      label: "Ad optimization consent",
      type: "select",
      options: [
        { value: "GRANTED", label: "Granted" },
        { value: "DENIED", label: "Denied" },
        { value: "UNSPECIFIED", label: "Unspecified" },
      ],
    },
    { key: "stageName", label: "Stage name", type: "string" },
    {
      key: "stageDate",
      label: "Stage date",
      type: "string",
      hint: "ISO 8601; when the lead entered the stage.",
    },
  ],
  output: [
    { key: "requestId", type: "string", label: "Hyros request id" },
    { key: "result", type: "string", label: '"OK" on success' },
  ],

  execute(input, ctx) {
    if (!input.findEmail && !input.findId && !input.findPhone) {
      throw new Error("Give at least one of: find by email, lead ID, or phone.");
    }
    const tags = csv(input.tags);
    const ips = csv(input.leadIps);
    const phones = csv(input.phoneNumbers);
    return new HyrosClient(ctx).write("PUT", "/leads", {
      query: { email: input.findEmail, id: input.findId, phone: input.findPhone },
      body: compact({
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        tags: tags.length ? tags : undefined,
        leadIps: ips.length ? ips : undefined,
        phoneNumbers: phones.length ? phones : undefined,
        adOptimizationConsent: input.adOptimizationConsent,
        leadStage: input.stageName
          ? compact({ name: input.stageName, date: input.stageDate })
          : undefined,
      }),
    });
  },
};

export default leadUpdate;
