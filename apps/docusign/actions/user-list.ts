import type { ActionDefinition } from "@w6w/types";
import { DocusignClient } from "../lib/client.ts";
import { paging, type PagingInput } from "../lib/params.ts";

interface Input extends PagingInput {
  email?: string;
  emailSubstring?: string;
  userNameSubstring?: string;
  status?: string;
  groupId?: string;
  additionalInfo?: boolean;
  includeLicense?: boolean;
}

/**
 * `GET /restapi/v2.1/accounts/{accountId}/users` — `Users: list`.
 *
 * Included because it is what turns a person into a `userId` — the value
 * `envelope-list`'s **User ID** filter takes, and the value Docusign uses
 * wherever a sender or shared-inbox owner has to be named. Email addresses are
 * the human handle; Docusign's routes want the GUID.
 *
 * Only the read is exposed. User *administration* (create, update, delete,
 * profile and signature images, group membership) is an operator concern that
 * belongs in Docusign's admin surface, not in a workflow step.
 */
const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Account Users",
  description: "List the users on the Docusign account, filtered by email, name, status or group.",
  params: [
    { key: "email", label: "Email", type: "string", hint: "Exact email address match." },
    { key: "emailSubstring", label: "Email contains", type: "string" },
    { key: "userNameSubstring", label: "Name contains", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "string",
      hint:
        "Comma-separated statuses: ActivationRequired, ActivationSent, Active, Closed, Disabled.",
    },
    { key: "groupId", label: "Group ID", type: "string", hint: "Only users in this group." },
    {
      key: "additionalInfo",
      label: "Additional info",
      type: "boolean",
      hint: "Include each user's full account and profile detail.",
    },
    { key: "includeLicense", label: "Include license", type: "boolean" },
    ...paging,
  ],
  output: [
    { key: "users", type: "array", label: "Users" },
    { key: "resultSetSize", type: "string", label: "Result set size" },
    { key: "totalSetSize", type: "string", label: "Total set size" },
    { key: "nextUri", type: "string", label: "Next page URI" },
  ],

  execute(input, ctx) {
    return new DocusignClient(ctx).request("/users", {
      query: {
        email: input.email,
        email_substring: input.emailSubstring,
        user_name_substring: input.userNameSubstring,
        status: input.status,
        group_id: input.groupId,
        additional_info: input.additionalInfo,
        include_license: input.includeLicense,
        count: input.count,
        start_position: input.startPosition,
      },
    });
  },
};

export default userList;
