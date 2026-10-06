import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { mailOutput } from "../lib/params.ts";

interface Input {
  checkId: string;
}

const checkGet: ActionDefinition<Input> = {
  key: "check-get",
  type: "read",
  resource: "check",
  title: "Get Check",
  description:
    "Retrieve one check by id, including its tracking events and expected delivery date.",
  params: [{
    key: "checkId",
    label: "Check ID",
    type: "string",
    required: true,
    placeholder: "chk_…",
    hint: "Lob ids start with `chk_`.",
  }],
  output: mailOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/checks/${encodeId(input.checkId)}`);
  },
};

export default checkGet;
