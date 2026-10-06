import type { ActionDefinition } from "@w6w/types";
import { OutsetaClient, pathId } from "../lib/client.ts";

interface Input {
  emailListUid: string;
}

/** `GET /api/v1/email/lists/{emailListUid}` — Retrieve one email list by Uid. */
const getEmailList: ActionDefinition<Input> = {
  key: "get-email-list",
  type: "read",
  resource: "email-list",
  title: "Get Email List",
  description: "Retrieve one email list by Uid.",
  params: [
    {
      key: "emailListUid",
      label: "Email list Uid",
      type: "string",
      hint: "The email list's Uid (the short alphanumeric id, e.g. `wZmNZm2O`).",
      required: true,
    },
  ],
  output: [
    {
      key: "Uid",
      type: "string",
      label: "Uid",
    },
    {
      key: "Created",
      type: "string",
      label: "Created",
    },
    {
      key: "Updated",
      type: "string",
      label: "Updated",
    },
  ],

  execute(input, ctx) {
    return OutsetaClient.fromConnection(ctx).request(`/email/lists/${pathId(input.emailListUid)}`, {
      method: "GET",
    });
  },
};

export default getEmailList;
