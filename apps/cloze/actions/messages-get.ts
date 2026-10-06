import type { ActionDefinition } from "@w6w/types";
import { call, parseList, pick } from "../lib/client.ts";
import { int, json } from "../lib/params.ts";

type Input = Record<string, unknown>;

const messagesGet: ActionDefinition<Input> = {
  key: "messages-get",
  type: "read",
  resource: "message",
  title: "Get Messages",
  description:
    "Read the content of timeline messages, from the references a timeline call returns.",
  params: [
    json("messages", "Messages", {
      required: true,
      hint: 'JSON array of {"key": "...", "changed": 123} from a timeline result.',
    }),
    int("wait", "Wait (ms)", {
      hint:
        "Maximum wait if a message must be fetched from its source (vendor default 5000). 0 = local copy only.",
    }),
  ],
  output: [
    { key: "items", type: "array", label: "Messages" },
    { key: "count", type: "number", label: "Messages returned" },
  ],

  async execute(input, ctx) {
    if (parseList("messages", input.messages).length === 0) throw new Error("messages is required");
    const res = await call(ctx, "POST", "/v1/messages/get", {
      body: { messages: parseList("messages", input.messages), ...pick(input, ["wait"]) },
    });
    return {
      items: (res.messages as unknown[] | undefined) ?? [],
      count: ((res.messages as unknown[] | undefined) ?? []).length,
    };
  },
};

export default messagesGet;
