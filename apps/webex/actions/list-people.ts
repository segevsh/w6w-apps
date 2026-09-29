import type { ActionDefinition } from "@w6w/types";
import { toList, unset, WebexClient } from "../lib/client.ts";

interface Input {
  email?: string;
  displayName?: string;
  id?: string;
  orgId?: string;
  roles?: string;
  locationId?: string;
  max?: number;
  excludeStatus?: boolean;
}

const listPeople: ActionDefinition<Input> = {
  key: "list-people",
  type: "search",
  resource: "person",
  title: "Search People",
  description: "Search for people in the organization. A non-admin token must set Email or " +
    "Display name.",
  params: [
    { key: "email", label: "Email", type: "string" },
    {
      key: "displayName",
      label: "Display name",
      type: "string",
      hint: "Matches the start of the name.",
    },
    {
      key: "id",
      label: "Person IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated, up to 85. Suppresses presence data when set.",
    },
    {
      key: "orgId",
      label: "Organization ID",
      type: "string",
      advanced: true,
      hint: "Admin-of-another-org (e.g. partner) use only.",
    },
    { key: "roles", label: "Role IDs", type: "string", advanced: true, hint: "Comma-separated." },
    { key: "locationId", label: "Location ID", type: "string", advanced: true },
    {
      key: "max",
      label: "Max results",
      type: "number",
      default: 50,
      hint: "Capped at 100 when Include Webex Calling details is set on Get actions.",
      validation: { min: 1, integer: true },
    },
    {
      key: "excludeStatus",
      label: "Exclude presence status",
      type: "boolean",
      advanced: true,
      hint: "Faster response when presence isn't needed.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Person ID" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "emails", type: "array", label: "Emails" },
  ],

  async execute(input, ctx) {
    const client = new WebexClient(ctx);
    const res = await client.request<{ items: unknown[] }>("/people", {
      query: {
        email: unset(input.email),
        displayName: unset(input.displayName),
        id: toList(input.id),
        orgId: unset(input.orgId),
        roles: toList(input.roles),
        locationId: unset(input.locationId),
        max: input.max,
        excludeStatus: input.excludeStatus,
      },
    });
    return res.items ?? [];
  },
};

export default listPeople;
