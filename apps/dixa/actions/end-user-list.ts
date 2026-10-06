import type { ActionDefinition } from "@w6w/types";
import { DixaClient } from "../lib/client.ts";
import { pagedGet, pagedOutput, pageParams } from "../lib/params.ts";

interface Input {
  email?: string;
  phone?: string;
  externalId?: string;
  pageLimit?: number;
  pageKey?: string;
}

const endUserList: ActionDefinition<Input> = {
  key: "end-user-list",
  type: "search",
  resource: "end-user",
  title: "List End Users",
  description:
    "List end users, optionally filtered by email, phone number or external id (the filters are alternatives — Dixa documents them for look-ups, not combined).",
  params: [
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone number", type: "string" },
    { key: "externalId", label: "External id", type: "string" },
    ...pageParams,
  ],
  output: [...pagedOutput],

  execute(input, ctx) {
    return pagedGet(new DixaClient(ctx), "/endusers", {
      email: input.email?.trim(),
      phone: input.phone?.trim(),
      externalId: input.externalId?.trim(),
      pageLimit: input.pageLimit,
      pageKey: input.pageKey,
    });
  },
};

export default endUserList;
