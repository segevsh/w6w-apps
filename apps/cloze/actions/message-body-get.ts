import type { ActionDefinition } from "@w6w/types";
import { call, requireStr } from "../lib/client.ts";
import { str } from "../lib/params.ts";

type Input = Record<string, unknown>;

const messageBodyGet: ActionDefinition<Input> = {
  key: "message-body-get",
  type: "read",
  resource: "message",
  title: "Get Message Body",
  description: "Fetch the full body of one message by its key.",
  params: [str("key", "Message key", { required: true })],
  output: [
    { key: "body", type: "string", label: "Body" },
    { key: "mimeType", type: "string", label: "MIME type" },
    { key: "expires", type: "string", label: "Expiry" },
  ],

  async execute(input, ctx) {
    const res = await call(ctx, "POST", "/v1/messages/body", {
      body: { key: requireStr("key", input.key) },
    });
    return res;
  },
};

export default messageBodyGet;
