import type { ActionDefinition } from "@w6w/types";
import { encodePathSegment, EzTextingClient } from "../lib/client.ts";

/** `GET /v1/keywords/{keyword}` — a purchased keyword and its settings. */
interface Input {
  keyword: string;
}

const keywordGet: ActionDefinition<Input> = {
  key: "keyword-get",
  type: "read",
  resource: "keyword",
  title: "Get Keyword",
  description: "Get a purchased keyword and its opt-in, forwarding and group settings.",
  params: [{ key: "keyword", label: "Keyword", type: "string", required: true }],
  output: [
    { key: "id", type: "number", label: "Keyword ID" },
    { key: "keyword", type: "string", label: "Keyword" },
    { key: "doubleOptInEnabled", type: "boolean", label: "Double opt-in enabled" },
    { key: "doubleOptInMessage", type: "string", label: "Double opt-in message" },
    { key: "joinMessage", type: "string", label: "Join message" },
    { key: "forwardEmails", type: "array", label: "Forward emails" },
    { key: "forwardUrl", type: "string", label: "Forward URL" },
    { key: "contactGroupIds", type: "array", label: "Contact group IDs" },
  ],

  async execute(input, ctx) {
    return (await new EzTextingClient(ctx).json(`/keywords/${encodePathSegment(input.keyword)}`)) ??
      {};
  },
};

export default keywordGet;
