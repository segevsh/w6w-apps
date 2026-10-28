import type { ActionDefinition } from "@w6w/types";
import { GraphClient, odataList, userPath } from "../lib/client.ts";
import { selectParam, userIdParam } from "../lib/params.ts";

interface Input {
  userId: string;
  select?: string[];
}

/**
 * `GET /users/{id | userPrincipalName}`
 *
 * https://learn.microsoft.com/en-us/graph/api/user-get?view=graph-rest-1.0
 *
 * Returns only the default property set unless `$select` names more. A UPN that begins with `$`
 * must be addressed as `/users('$x@y.com')` (handled by `userPath`), and a B2B guest's UPN carries
 * a `#` that is sent as `%23`. An unknown user is `404 Request_ResourceNotFound`.
 */
const getUser: ActionDefinition<Input, Record<string, unknown>> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Get one user by object id or user principal name.",
  params: [userIdParam, selectParam()],
  output: [
    { key: "id", type: "string", label: "Object id" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "userPrincipalName", type: "string", label: "User principal name" },
    { key: "mail", type: "string", label: "Mail" },
    { key: "jobTitle", type: "string", label: "Job title" },
  ],

  async execute(input, ctx) {
    const client = new GraphClient(ctx);
    return await client.request(userPath(input.userId), {
      query: { $select: odataList(input.select) },
    });
  },
};

export default getUser;
