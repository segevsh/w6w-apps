import type { ActionDefinition } from "@w6w/types";
import { ActionNetworkClient, strList } from "../lib/client.ts";
import type { Input } from "../lib/factory.ts";
import {
  BACKGROUND_PARAM,
  buildPerson,
  PERSON_OUTPUT,
  PERSON_PARAMS,
  requireContact,
  TAG_OP_PARAMS,
} from "../lib/person.ts";
import { compact } from "../lib/client.ts";

/**
 * Person Signup Helper: `POST /people`. The ONLY way to create a person — the collection itself
 * refuses a plain POST. People are matched by email and phone, so this is also an upsert.
 */
const personSignup: ActionDefinition<Input> = {
  key: "person-signup",
  type: "perform",
  resource: "person",
  title: "Create or Update Person",
  description:
    "Create a person, or update the one matching the email or phone, and optionally tag them. Matching is by email address and phone number; a new person is subscribed to the key's list unless you pass a status.",
  idempotent: true,
  params: [...PERSON_PARAMS, ...TAG_OP_PARAMS, BACKGROUND_PARAM],
  output: PERSON_OUTPUT,

  execute(input, ctx) {
    requireContact(input);
    const body = compact({
      person: buildPerson(input),
      add_tags: strList(input.addTags),
      remove_tags: strList(input.removeTags),
    });
    return new ActionNetworkClient(ctx).create("/people", body, input.backgroundRequest === true);
  },
};

export default personSignup;
