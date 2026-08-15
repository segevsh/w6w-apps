import type { ActionDefinition } from "@w6w/types";
import { CallRailClient, encodeId } from "../lib/client.ts";
import { accountIdParam, tagColorOptions } from "../lib/params.ts";

/** `POST /v3/a/{account_id}/tags.json` — Creating a Tag. */
interface Input {
  accountId: string;
  name: string;
  companyId?: string;
  color?: string;
  tagLevel?: "company" | "account";
}

const tagCreate: ActionDefinition<Input> = {
  key: "tag-create",
  type: "perform",
  resource: "tag",
  title: "Create Tag",
  description: "Create a tag, scoped to one company or to every company in the account.",
  idempotent: false,
  params: [
    accountIdParam,
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "companyId",
      label: "Company",
      type: "string",
      hint: "Required unless Tag level is Account.",
    },
    { key: "color", label: "Color", type: "select", options: tagColorOptions },
    {
      key: "tagLevel",
      label: "Tag level",
      type: "select",
      options: [
        { value: "company", label: "Company (default)" },
        { value: "account", label: "Account — applies to every company; admins only" },
      ],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Tag ID" },
    { key: "name", type: "string", label: "Tag name" },
    { key: "tag_level", type: "string", label: "company or account" },
    { key: "status", type: "string", label: "enabled or disabled" },
  ],

  execute(input, ctx) {
    return new CallRailClient(ctx).json(`/a/${encodeId(input.accountId)}/tags.json`, {
      method: "POST",
      body: {
        name: input.name,
        company_id: input.companyId,
        color: input.color,
        tag_level: input.tagLevel,
      },
    });
  },
};

export default tagCreate;
