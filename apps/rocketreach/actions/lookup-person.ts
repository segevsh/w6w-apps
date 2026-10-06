import type { ActionDefinition } from "@w6w/types";
import { RocketReachClient } from "../lib/client.ts";
import {
  LOOKUP_ASYNC,
  LOOKUP_IDENTITY,
  lookupQuery,
  PROFILE_OUTPUT,
  profileOutput,
} from "../lib/profile.ts";

type Input = Record<string, unknown>;

/**
 * `GET /person/lookup`. Asynchronous: the answer carries a `status`. Anything
 * other than `complete` means the lookup is still running; poll Check Lookup
 * Status with the returned `id`, or let a webhook deliver it. The lookup type
 * (standard, premium, phone, enrich, ...) is not exposed: it is an account-level
 * credit choice the docs list but do not explain.
 */
const lookupPerson: ActionDefinition<Input> = {
  key: "lookup-person",
  type: "read",
  resource: "person",
  title: "Lookup Person",
  description: "Reveal a person's emails (with deliverability grades) and phone numbers from a " +
    "RocketReach ID, LinkedIn URL, email, phone, NPI number, or name plus employer. Consumes " +
    "credits when contact data is found; re-looking-up a profile is free. The lookup may still be " +
    "running (complete: false): poll Check Lookup Status with the profile id. For Universal " +
    "Credits accounts use Universal Lookup Person.",
  params: [...LOOKUP_IDENTITY, ...LOOKUP_ASYNC],
  output: PROFILE_OUTPUT,

  async execute(input, ctx) {
    const { body } = await new RocketReachClient(ctx).request("/person/lookup", {
      query: lookupQuery(input),
    });
    return profileOutput(body);
  },
};

export default lookupPerson;
