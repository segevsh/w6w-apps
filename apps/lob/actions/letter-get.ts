import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { mailOutput } from "../lib/params.ts";

interface Input {
  letterId: string;
}

const letterGet: ActionDefinition<Input> = {
  key: "letter-get",
  type: "read",
  resource: "letter",
  title: "Get Letter",
  description:
    "Retrieve one letter by id, including its tracking events and expected delivery date.",
  params: [{
    key: "letterId",
    label: "Letter ID",
    type: "string",
    required: true,
    placeholder: "ltr_…",
    hint: "Lob ids start with `ltr_`.",
  }],
  output: mailOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/letters/${encodeId(input.letterId)}`);
  },
};

export default letterGet;
