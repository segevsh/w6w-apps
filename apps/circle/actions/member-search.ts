import type { ActionDefinition } from "@w6w/types";
import { CircleClient } from "../lib/client.ts";
import { memberOutput } from "../lib/params.ts";

/**
 * `GET /community_members/search?email=` — look a member up by address.
 *
 * This is a **separate route**, not a filter on the list: `email` is not among
 * `GET /community_members`'s parameters, and `GET /community_members/{id}` takes
 * only the numeric id. So the email lookup every integration actually needs —
 * "does this person exist in the community yet?" — lives here and nowhere else.
 *
 * Despite the name it is an exact-match lookup of one record, not a query: the
 * endpoint declares exactly one parameter, `email`, required, and returns a
 * single `community_member` or 404. It is therefore typed `read` rather than
 * `search`, and its output is a member rather than a paginated envelope.
 *
 * A missing member is a 404, which the client raises. That is deliberate rather
 * than swallowed into a null: "not found" and "the call failed" are different
 * outcomes, and a workflow that wants to branch on absence should do so on the
 * error rather than on an empty object that could equally mean a broken parse.
 */
interface Input {
  email: string;
}

const memberSearch: ActionDefinition<Input> = {
  key: "member-search",
  type: "read",
  resource: "member",
  title: "Find Member by Email",
  description: "Look up a single community member by email address. 404s if there is no match.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      placeholder: "person@example.com",
      hint: "Exact match. The only way to resolve an address to a member id.",
    },
  ],
  output: memberOutput,

  execute(input, ctx) {
    return new CircleClient(ctx).request("/community_members/search", {
      query: { email: input.email },
    });
  },
};

export default memberSearch;
