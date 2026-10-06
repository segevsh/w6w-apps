import type { ActionDefinition } from "@w6w/types";
import { DropcontactClient, ENRICH_PATH } from "../lib/client.ts";

/**
 * Dropcontact has no balance endpoint. The reference ("Credits Left") says to POST one empty
 * object to `/all`: it "will return your remaining credits without consuming any".
 */
const getCreditsLeft: ActionDefinition = {
  key: "get-credits-left",
  type: "read",
  resource: "account",
  title: "Get Credits Left",
  description: "Read the credits left on the access token. Sends one empty contact to the enrich " +
    "endpoint, which the vendor documents as not consuming any credit.",
  params: [],
  output: [{ key: "creditsLeft", type: "number", label: "Credits left" }],

  async execute(_input, ctx) {
    const { body } = await new DropcontactClient(ctx).request("POST", ENRICH_PATH, {
      body: { data: [{}] },
    });
    return { creditsLeft: body.credits_left };
  },
};

export default getCreditsLeft;
