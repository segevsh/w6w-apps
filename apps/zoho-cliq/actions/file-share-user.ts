import type { ActionDefinition } from "@w6w/types";
import { seg, SUCCESS, type Success, ZohoCliqClient } from "../lib/client.ts";
import { buildFileForm, type FileInput } from "../lib/files.ts";
import { fileParams } from "../lib/params.ts";

interface Input extends FileInput {
  user: string;
}

/**
 * `POST /api/v2/buddies/{EMAIL_ID | ZUID}/files` — multipart upload, scope
 * `ZohoCliq.Webhooks.CREATE`, `204`. Up to 50 MB per file.
 */
const fileShareUser: ActionDefinition<Input, Success> = {
  key: "file-share-user",
  type: "perform",
  resource: "file",
  title: "Share File with User",
  description: "Send a file to a user as a direct message, by email address or Zoho user id.",
  idempotent: false,
  params: [
    { key: "user", label: "User email or ID", type: "string", required: true },
    ...fileParams,
  ],
  output: [{ key: "success", type: "boolean", label: "Shared" }],

  async execute(input, ctx) {
    await new ZohoCliqClient(ctx).request(`/buddies/${seg(input.user)}/files`, {
      method: "POST",
      form: buildFileForm(input),
    });
    return SUCCESS;
  },
};

export default fileShareUser;
