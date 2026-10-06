import type { ActionDefinition } from "@w6w/types";
import { LeexiClient, seg } from "../lib/client.ts";

interface Input {
  uuid: string;
}

/** `GET /calls/{uuid}` */
const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description:
    "Retrieve one call or meeting with its AI completions plus the call topics and the full transcript (word-level timestamps), and its simple transcript. A call outside the key's access scope answers 404.",
  params: [
    {
      key: "uuid",
      label: "Call UUID",
      type: "string",
      required: true,
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "The record returned by Leexi (empty object for a delete)",
    },
    { key: "message", type: "string", label: "Leexi's confirmation message" },
  ],

  async execute(input, ctx) {
    const res = await new LeexiClient(ctx).request("GET", `/calls/${seg(input.uuid)}`);
    return { data: res.data ?? null, message: res.message ?? null };
  },
};

export default callGet;
