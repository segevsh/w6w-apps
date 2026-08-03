import type { ActionDefinition } from "@w6w/types";
import { CopperClient } from "../lib/client.ts";

interface Input {
  email: string;
}

/**
 * `POST /people/fetch_by_email` — look a Person up by their email address.
 *
 * Another POST that reads rather than writes, and worth having as its own action
 * rather than folding into Search: email is a **unique key** for People in
 * Copper ("no two records can have the same email address"), so this is an exact
 * lookup returning a single Person, not a filtered list. `POST /people/search`
 * with an `emails` filter is the fuzzy cousin and returns an array.
 *
 * The email goes in the request body, not the path — an address in a URL segment
 * would need escaping and Copper does not accept it there.
 *
 * A miss is a 404 from Copper, which surfaces as an error rather than an empty
 * result; that is Copper's behaviour, not a choice made here.
 */
const findPersonByEmail: ActionDefinition<Input> = {
  key: "find-person-by-email",
  type: "read",
  resource: "person",
  title: "Find Person by Email",
  description:
    "Fetch the single Person with this email address. Email is a unique key for People in Copper, " +
    "so this is an exact lookup — `POST /people/fetch_by_email`, with the address in the body.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "jim@example.com",
      validation: { pattern: "^[^@\\s]+@[^@\\s]+$" },
    },
  ],
  output: [
    { key: "id", type: "number", label: "Person ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new CopperClient(ctx).request("/people/fetch_by_email", {
      method: "POST",
      body: { email: input.email },
    });
  },
};

export default findPersonByEmail;
