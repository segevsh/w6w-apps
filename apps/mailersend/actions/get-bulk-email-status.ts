import type { ActionDefinition } from "@w6w/types";
import { MailerSendClient, seg } from "../lib/client.ts";

interface Input {
  bulkEmailId: string;
}

const getBulkEmailStatus: ActionDefinition<Input> = {
  key: "get-bulk-email-status",
  type: "read",
  resource: "email",
  title: "Get Bulk Email Status",
  description:
    "Read a bulk send's progress (GET /v1/bulk-email/{id}): `state`, recipient counts, `validation_errors` (indexed `message.{n}` in send order) and `suppressed_recipients`.",
  params: [{
    key: "bulkEmailId",
    label: "Bulk email ID",
    type: "string",
    required: true,
    hint: "The `bulkEmailId` Send Bulk Email returned.",
  }],
  output: [{ key: "data", type: "object", label: "The bulk email record" }],

  execute(input, ctx) {
    return new MailerSendClient(ctx).json(`/bulk-email/${seg(input.bulkEmailId)}`);
  },
};

export default getBulkEmailStatus;
