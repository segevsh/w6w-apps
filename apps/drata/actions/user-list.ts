import type { ActionDefinition } from "@w6w/types";
import { DrataClient, toList } from "../lib/client.ts";
import { expandParam, pageParams } from "../lib/params.ts";

/**
 * `GET /users` — List Drata users (the people with a login), optionally filtered by name prefix.
 *
 * Cursor-paginated: pass the result's `nextCursor` back as `cursor` until it is `null`.
 */
interface Input {
  firstName?: string;
  lastName?: string;
  expand?: string[] | string;
  cursor?: string;
  size?: number;
  includeTotalCount?: boolean;
}

const action: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List Drata users (the people with a login), optionally filtered by name prefix.",
  params: [
    { key: "firstName", label: "First name", type: "string", hint: "Prefix match." },
    { key: "lastName", label: "Last name", type: "string", hint: "Prefix match." },
    expandParam(["backgroundChecks", "documents", "personnel", "identities", "roles"]),
    ...pageParams,
  ],
  output: [
    { key: "items", type: "array", label: "Users" },
    {
      key: "nextCursor",
      type: "string",
      label: "Cursor for the next page (null on the last page)",
    },
    {
      key: "totalCount",
      type: "number",
      label: "Total matching records (only with Include total count, first page)",
    },
  ],

  execute(input, ctx) {
    return new DrataClient(ctx).list(`/users`, {
      "firstName": input.firstName,
      "lastName": input.lastName,
      "expand[]": toList(input.expand),
      cursor: input.cursor,
      size: input.size,
      includeTotalCount: input.includeTotalCount || undefined,
    });
  },
};

export default action;
