import type { ActionDefinition } from "@w6w/types";
import { TalentLmsClient } from "../lib/client.ts";

interface Input {
  iltId: number;
}

const iltGetSessions: ActionDefinition<Input> = {
  key: "ilt-get-sessions",
  type: "read",
  resource: "unit",
  title: "Get ILT Sessions",
  description: "The sessions of an instructor-led training unit.",
  params: [
    { key: "iltId", label: "ILT unit ID", type: "number", required: true },
  ],

  execute(input, ctx) {
    return new TalentLmsClient(ctx).get("getiltsessions", {
      ilt_id: input.iltId,
    });
  },
};

export default iltGetSessions;
