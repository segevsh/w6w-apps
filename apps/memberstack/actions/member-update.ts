import type { ActionDefinition } from "@w6w/types";
import { compact, MemberstackClient } from "../lib/client.ts";
import { asObject, memberIdParam } from "../lib/params.ts";

/**
 * `PATCH /members/:id`. Partial: `customFields` and `metaData` are shallow-merged with the
 * existing values (`metaData` also drops falsy keys), but `json` is FULLY REPLACED. A
 * member that does not exist answers `400 "There is no member with this identifier."`.
 */
interface Input {
  memberId: string;
  email?: string;
  customFields?: unknown;
  metaData?: unknown;
  json?: unknown;
  loginRedirect?: string;
  verified?: boolean;
  profileImage?: string;
}

const memberUpdate: ActionDefinition<Input> = {
  key: "member-update",
  type: "perform",
  resource: "member",
  title: "Update Member",
  description: "Update a member. customFields and metaData merge; json is replaced wholesale.",
  idempotent: true,
  params: [
    memberIdParam,
    { key: "email", label: "Email", type: "string" },
    { key: "customFields", label: "Custom fields", type: "json", hint: "Shallow-merged." },
    { key: "metaData", label: "Metadata", type: "json", hint: "Shallow-merged." },
    {
      key: "json",
      label: "Member JSON",
      type: "json",
      hint: "REPLACES the member's whole json object — fetch, merge, then send.",
    },
    { key: "loginRedirect", label: "Login redirect", type: "string" },
    { key: "verified", label: "Email verified", type: "boolean" },
    { key: "profileImage", label: "Profile image URL", type: "string" },
  ],
  output: [{ key: "member", type: "object", label: "The updated member" }],

  async execute(input, ctx) {
    const body = await new MemberstackClient(ctx).json<{ data?: unknown }>(
      `/members/${encodeURIComponent(input.memberId)}`,
      {
        method: "PATCH",
        body: compact({
          email: input.email,
          customFields: asObject(input.customFields, "customFields"),
          metaData: asObject(input.metaData, "metaData"),
          json: asObject(input.json, "json"),
          loginRedirect: input.loginRedirect,
          verified: input.verified,
          profileImage: input.profileImage,
        }),
      },
    );
    return { member: body?.data ?? null };
  },
};

export default memberUpdate;
