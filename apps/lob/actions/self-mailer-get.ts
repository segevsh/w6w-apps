import type { ActionDefinition } from "@w6w/types";
import { encodeId, LobClient } from "../lib/client.ts";
import { mailOutput } from "../lib/params.ts";

interface Input {
  selfMailerId: string;
}

const selfMailerGet: ActionDefinition<Input> = {
  key: "self-mailer-get",
  type: "read",
  resource: "self-mailer",
  title: "Get Self Mailer",
  description:
    "Retrieve one self mailer by id, including its tracking events and expected delivery date.",
  params: [{
    key: "selfMailerId",
    label: "Self Mailer ID",
    type: "string",
    required: true,
    placeholder: "sfm_…",
    hint: "Lob ids start with `sfm_`.",
  }],
  output: mailOutput,

  execute(input, ctx) {
    return new LobClient(ctx).json(`/self_mailers/${encodeId(input.selfMailerId)}`);
  },
};

export default selfMailerGet;
