import type { ActionDefinition } from "@w6w/types";
import { EnchargeClient } from "../lib/client.ts";
import { personRef, personRefParams } from "../lib/people.ts";
import type { PersonRef } from "../lib/people.ts";

/**
 * Unsubscribe Person — `POST /v1/people/unsubscribe?email=|userId=|id=`. Verified against the
 * OpenAPI document (`UnsubscribePerson`, 204), fetched 2026-10-06. The identifiers travel in the
 * QUERY string, not a body.
 */
const personUnsubscribe: ActionDefinition<PersonRef> = {
  key: "person-unsubscribe",
  type: "perform",
  resource: "people",
  title: "Unsubscribe Person",
  description: "Unsubscribe a person so Encharge sends them no more email.",
  idempotent: true,
  params: [...personRefParams],
  output: [{ key: "ok", type: "boolean", label: "True when Encharge accepted the request" }],

  async execute(input, ctx) {
    const ref = personRef(input);
    return await new EnchargeClient(ctx).request("POST", "/people/unsubscribe", {
      query: [["email", ref.email], ["userId", ref.userId], ["id", ref.id]],
    });
  },
};

export default personUnsubscribe;
