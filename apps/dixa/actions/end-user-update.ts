import type { ActionDefinition } from "@w6w/types";
import { DixaClient, encodeId } from "../lib/client.ts";
import { endUserBody, endUserParams } from "./end-user-create.ts";

interface Input {
  userId: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  additionalEmails?: string[] | string;
  additionalPhoneNumbers?: string[] | string;
  externalId?: string;
  avatarUrl?: string;
}

const endUserUpdate: ActionDefinition<Input> = {
  key: "end-user-update",
  type: "perform",
  resource: "end-user",
  title: "Update End User",
  description: "Patch an end user. Only the fields you fill in are sent.",
  idempotent: true,
  params: [
    { key: "userId", label: "End user id", type: "string", required: true, hint: "End user UUID." },
    ...endUserParams,
  ],
  output: [{ key: "data", type: "object", label: "The updated end user" }],

  execute(input, ctx) {
    const id = encodeId(input.userId, "userId");
    const body = endUserBody(input as unknown as Record<string, unknown>);
    if (Object.keys(body).length === 0) throw new Error("provide at least one field to update");
    return new DixaClient(ctx).json(`/endusers/${id}`, { method: "PATCH", body });
  },
};

export default endUserUpdate;
