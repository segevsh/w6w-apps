import type { ActionDefinition } from "@w6w/types";
import { HousecallClient } from "../lib/client.ts";
import { companyIdParam } from "../lib/params.ts";

/**
 * `GET /company` — the company profile, and the entry point for multi-location.
 *
 * This is the endpoint `docs/franchise.md` tells a multi-location account to
 * call first: its `locations` array carries the ids that every other action's
 * "Location ID" field takes. Under an OAuth connection that array is already
 * filtered to the locations the authorising user may reach, so it doubles as
 * "what can this connection see".
 *
 * It is also the probe both auth methods use, for the reasons in
 * `auth/api-key.ts` — it accepts all three credential kinds and returns nothing
 * secret.
 */
interface Input {
  companyId?: string;
}

const companyGet: ActionDefinition<Input> = {
  key: "company-get",
  type: "read",
  resource: "company",
  title: "Get Company",
  description:
    "Fetch the company profile. Its `locations` array holds the location ids the X-Company-Id " +
    "field on every other action expects.",
  params: [companyIdParam],
  output: [
    { key: "id", type: "string", label: "Company ID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "support_email", type: "string", label: "Support email" },
    { key: "phone_number", type: "string", label: "Phone number" },
    { key: "time_zone", type: "string", label: "Time zone" },
    { key: "address", type: "object", label: "Address" },
    { key: "locations", type: "array", label: "Locations" },
    { key: "franchise_info", type: "object", label: "Franchise info (franchise accounts only)" },
  ],

  execute(input, ctx) {
    return new HousecallClient(ctx).json("/company", { companyId: input.companyId });
  },
};

export default companyGet;
