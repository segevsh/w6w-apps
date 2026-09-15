import type { ActionDefinition } from "@w6w/types";
import { compact, ShortcutClient } from "../lib/client.ts";

/** `GET /api/v3/members` — every Member of the workspace. Answers a bare JSON array. */
interface Input {
  orgPublicId?: string;
  disabled?: boolean;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "List every Member of the connected workspace.",
  params: [
    {
      key: "orgPublicId",
      label: "Organization ID",
      type: "string",
      hint: "Restrict to a specific Organization's UUID. Leave empty for the token's own.",
    },
    {
      key: "disabled",
      label: "Disabled",
      type: "boolean",
      hint: "Leave empty to return both enabled and disabled Members.",
    },
  ],
  output: [{ key: "data", type: "array", label: "Members" }],

  execute(input, ctx) {
    return new ShortcutClient(ctx).get(
      "/members",
      compact({ "org-public-id": input.orgPublicId, disabled: input.disabled }),
    );
  },
};

export default memberList;
