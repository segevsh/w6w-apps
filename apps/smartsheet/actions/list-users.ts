import type { ActionDefinition } from "@w6w/types";
import {
  csv,
  type IndexResult,
  PAGE_OUTPUT,
  PAGE_PARAMS,
  type PageInput,
  pageQuery,
  SmartsheetClient,
} from "../lib/client.ts";

interface Input extends PageInput {
  email?: string;
  include?: string[];
}

/**
 * `GET /users` — users in the organization account.
 *
 * **This one needs admin rights and will legitimately fail without them.** The
 * operation's own description lists a pile of attributes returned only "For
 * System admins" (`admin`, `licensedSheetCreator`, `status`, `seatType`, …), and
 * `planId` / `seatType` are documented as "only available to system
 * administrators". A non-admin token is not a broken connection — which is why
 * the auth `test` hook probes `/users/me` and not this.
 *
 * `include=lastLogin` is exposed but deliberately hint-heavy, because Smartsheet
 * documents four separate conditions that silently drop it from the response:
 * `includeAll=true` is present, `planId` is present, `seatType` is present, or
 * `pageSize` is above 100. It also requires System Admin and a result set of
 * 100 or fewer users.
 */
const listUsers: ActionDefinition<Input, IndexResult> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List users in the organization account. Requires admin rights — a non-admin token gets a " +
    "reduced response or an error, which is not a sign of a broken connection.",
  params: [
    {
      key: "email",
      label: "Email filter",
      type: "string",
      hint: "Comma-separated email addresses to filter by.",
    },
    {
      key: "include",
      label: "Include",
      type: "multiselect",
      options: [
        { value: "lastLogin", label: "lastLogin — System Admin only, and easily suppressed" },
      ],
      hint:
        "`lastLogin` is dropped without warning if Include all is set, or Page size is above 100, " +
        "or the caller is not a System Admin, or more than 100 users are returned.",
    },
    ...PAGE_PARAMS,
  ],
  output: PAGE_OUTPUT,

  execute(input, ctx) {
    return new SmartsheetClient(ctx).request<IndexResult>("/users", {
      query: {
        email: csv(input.email),
        include: csv(input.include),
        ...pageQuery(input),
      },
    });
  },
};

export default listUsers;
