import type { ActionDefinition } from "@w6w/types";
import { ThriveCartClient } from "../lib/client.ts";
import { affiliateIdParam, modeParam } from "../lib/params.ts";

/**
 * `POST /affiliate` — one affiliate's profile and product registrations.
 * Despite the verb this reads a single record (no documented GET
 * equivalent), so it is typed `read`, matching `customer-get`.
 */
interface Input {
  affiliateId: string;
  mode?: string;
}

const affiliateGet: ActionDefinition<Input> = {
  key: "affiliate-get",
  type: "read",
  resource: "affiliate",
  title: "Get Affiliate",
  description: "Read one affiliate's profile and product registrations.",
  params: [affiliateIdParam, modeParam],
  output: [
    { key: "user_id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "affiliate_id", type: "string", label: "Affiliate ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_favourite", type: "boolean", label: "Favourite" },
    { key: "products", type: "array", label: "Registered products" },
  ],

  execute(input, ctx) {
    return new ThriveCartClient(ctx).post("/affiliate", {
      form: { affiliate_id: input.affiliateId },
      mode: input.mode,
    });
  },
};

export default affiliateGet;
