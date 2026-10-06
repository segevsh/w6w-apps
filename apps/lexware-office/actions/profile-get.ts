import type { ActionDefinition } from "@w6w/types";
import { LexwareClient } from "../lib/client.ts";

/** `GET /v1/profile` — the organization behind the API key. */
const profileGet: ActionDefinition<Record<string, never>> = {
  key: "profile-get",
  type: "read",
  resource: "profile",
  title: "Get Profile",
  description: "Organization name, subscription status, business features and tax type of the " +
    "account the API key belongs to.",
  params: [],
  output: [
    { key: "organizationId", type: "string", label: "Organization id" },
    { key: "companyName", type: "string", label: "Company name" },
    { key: "subscriptionStatus", type: "string", label: "Subscription status" },
    { key: "businessFeatures", type: "array", label: "Business features" },
    { key: "taxType", type: "string", label: "Tax type" },
    { key: "smallBusiness", type: "boolean", label: "Small business (Kleinunternehmer)" },
  ],
  execute: (_input, ctx) => new LexwareClient(ctx).json("/profile"),
};

export default profileGet;
