import type { ActionDefinition } from "@w6w/types";
import { csv, unset, WhatsAppClient } from "../lib/client.ts";

interface Input {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  vertical?: string;
  websites?: string;
}

/** Meta's own `vertical` enum — the industry categories the profile accepts. */
const VERTICALS = [
  "UNDEFINED",
  "OTHER",
  "AUTO",
  "BEAUTY",
  "APPAREL",
  "EDU",
  "ENTERTAIN",
  "EVENT_PLAN",
  "FINANCE",
  "GROCERY",
  "GOVT",
  "HOTEL",
  "HEALTH",
  "NONPROFIT",
  "PROF_SERVICES",
  "RETAIL",
  "TRAVEL",
  "RESTAURANT",
  "NOT_A_BIZ",
] as const;

const businessProfileUpdate: ActionDefinition<Input> = {
  key: "business-profile-update",
  type: "perform",
  resource: "business-profile",
  title: "Update Business Profile",
  description:
    "Update this phone number's WhatsApp Business profile. Only the fields set are changed.",
  // Setting the same fields again produces the same profile — safe to retry.
  idempotent: true,
  params: [
    { key: "about", label: "About", type: "string" },
    { key: "address", label: "Address", type: "string", hint: "Max 256 characters." },
    {
      key: "description",
      label: "Description",
      type: "text",
      config: { multiline: true },
      hint: "Max 512 characters.",
    },
    { key: "email", label: "Email", type: "string", hint: "Max 128 characters." },
    {
      key: "vertical",
      label: "Industry",
      type: "select",
      options: VERTICALS.map((v) => ({ value: v, label: v })),
    },
    {
      key: "websites",
      label: "Websites",
      type: "string",
      hint: "Comma-separated URLs, each including http:// or https://.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx) {
    return new WhatsAppClient(ctx).updateBusinessProfile({
      about: unset(input.about),
      address: unset(input.address),
      description: unset(input.description),
      email: unset(input.email),
      vertical: unset(input.vertical),
      websites: csv(input.websites),
    });
  },
};

export default businessProfileUpdate;
