import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { mailOutput } from "../lib/params.ts";

interface Input {
  postcardId: string;
}

const postcardGet: ActionDefinition<Input> = {
  key: "postcard-get",
  type: "read",
  resource: "postcard",
  title: "Get Postcard",
  description:
    "Retrieve one postcard by id, including its tracking events and expected delivery date.",
  params: [{
    key: "postcardId",
    label: "Postcard ID",
    type: "string",
    required: true,
    placeholder: "psc_…",
    hint: "Lob ids start with `psc_`.",
  }],
  output: mailOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/postcards/${encodeId(input.postcardId)}`);
  },
};

export default postcardGet;
