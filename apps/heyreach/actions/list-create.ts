import type { ActionDefinition } from "@w6w/types";
import { compact, HeyReachClient } from "../lib/client.ts";

interface Input {
  name: string;
  type?: string;
}

/**
 * `POST /api/public/list/CreateEmptyList` — a new, empty lead or company list.
 *
 * ## Not idempotent
 *
 * Nothing in the body deduplicates a list name, so a retried step creates a
 * second list. `idempotent: false`, and the created `id` is returned so a
 * caller can check before retrying.
 *
 * ## The type is `USER_LIST` or `COMPANY_LIST`
 *
 * The document's prose names exactly those two values, and says a list of type
 * `USER_LIST` — a *lead* list — is what a campaign's `linkedInUserListId`
 * must point at. The field is optional in the form because the API defaults to
 * a lead list when it is omitted; the action only sends it when set.
 */
const action: ActionDefinition<Input> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description: "Create an empty lead or company list (POST /api/public/list/CreateEmptyList).",
  idempotent: false,
  params: [
    {
      key: "name",
      label: "List name",
      type: "string",
      required: true,
      hint: "No uniqueness rule is documented — two calls with the same name create two lists.",
    },
    {
      key: "type",
      label: "List type",
      type: "select",
      options: [
        { value: "USER_LIST", label: "Lead list" },
        { value: "COMPANY_LIST", label: "Company list" },
      ],
      hint: "Leave empty to create a lead list (the API's default). A campaign's " +
        "`linkedInUserListId` must be a LEAD list.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Created list ID" },
    { key: "name", type: "string", label: "List name" },
    { key: "count", type: "number", label: "Leads in the list (0)" },
    { key: "listType", type: "string", label: "List type" },
    { key: "creationTime", type: "string", label: "Created at" },
    { key: "status", type: "string", label: "List status" },
  ],

  execute(input, ctx) {
    return new HeyReachClient(ctx).request("/list/CreateEmptyList", {
      method: "POST",
      body: compact({ name: input.name, type: input.type }),
    });
  },
};

export default action;
