import type { ActionDefinition } from "@w6w/types";
import { csv, JobberClient, PAGE_INFO, USER_FIELDS } from "../lib/client.ts";

interface Input {
  status?: string;
  userIds?: string;
  searchTerm?: string;
  first?: number;
  after?: string;
}

const QUERY = `
  query ListUsers(
    $filter: UsersFilterAttributes!
    $searchTerm: String
    $first: Int
    $after: String
  ) {
    users(filter: $filter, searchTerm: $searchTerm, first: $first, after: $after) {
      nodes { ${USER_FIELDS} }
      ${PAGE_INFO}
    }
  }
`;

/**
 * The team directory — the source of the user EncodedIds that assignment takes
 * (`visit-create`'s assignees, `job-create-from-quote`'s crew, the salesperson
 * on a quote).
 *
 * `filter` is **non-null here**, uniquely among this app's list queries, and
 * `UsersFilterAttributes.status` is non-null inside it. There is no "all users"
 * call: Jobber makes you say whether you mean active or deactivated staff. The
 * default is `ACTIVATED`, which is what an assignment lookup wants.
 *
 * `User.name` is an object (`{ first, last, full }`), not a string, and
 * `User.email` is `UserEmail` (`{ raw, isValid }`) rather than a plain address —
 * so a workflow reading `user.name` gets an object, and wants `user.name.full`.
 */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description:
    "List team members. Defaults to activated users — the ones that can be assigned work. Note `name` and `email` are nested objects.",
  params: [
    {
      key: "status",
      label: "Status",
      type: "select",
      default: "ACTIVATED",
      required: true,
      options: [
        { value: "ACTIVATED", label: "Activated" },
        { value: "DEACTIVATED", label: "Deactivated" },
      ],
      hint: "Required by Jobber — there is no 'all users' filter.",
    },
    {
      key: "userIds",
      label: "User IDs",
      type: "string",
      hint: "Comma-separated EncodedIds, to resolve a known set in one call.",
      advanced: true,
    },
    { key: "searchTerm", label: "Search", type: "string" },
    {
      key: "first",
      label: "Page size",
      type: "number",
      default: 50,
      validation: { min: 1, max: 100, integer: true },
    },
    { key: "after", label: "Cursor", type: "string" },
  ],
  output: [{ key: "users", type: "object", label: "Page of users with pageInfo" }],

  execute(input, ctx) {
    return new JobberClient(ctx).query(QUERY, {
      filter: {
        status: input.status ?? "ACTIVATED",
        userIds: csv(input.userIds),
      },
      searchTerm: input.searchTerm,
      first: input.first ?? 50,
      after: input.after,
    });
  },
};

export default userList;
