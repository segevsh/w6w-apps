import type { ActionDefinition } from "@w6w/types";
import { twist } from "../lib/client.ts";

/**
 * `POST /api/v3/url_join/join_workspace`
 *
 * Join the workspace a URL join link belongs to.
 */
interface Input {
  urlInviteCode: string;
}

const workspaceJoinByUrl: ActionDefinition<Input> = {
  key: "workspace-join-by-url",
  type: "perform",
  resource: "workspace",
  title: "Join Workspace by Link",
  description: "Join the workspace a URL join link belongs to.",
  idempotent: true,
  params: [
    {
      key: "urlInviteCode",
      label: "Join link code",
      type: "string",
      required: true,
      hint: "The code from the URL join link.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Workspace ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return twist(ctx, {
      method: "POST",
      path: "/url_join/join_workspace",
      params: { "url_invite_code": input.urlInviteCode },
    });
  },
};

export default workspaceJoinByUrl;
