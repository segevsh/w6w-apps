import type { ActionDefinition } from "@w6w/types";
import { encodeId, GoCanvasClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  dispatchId: number;
}

const dispatchGet: ActionDefinition<Input> = {
  key: "dispatch-get",
  type: "read",
  resource: "dispatch",
  title: "Get Dispatch",
  description: "Fetch one dispatch with its pre-filled responses.",
  params: [
    idParam("dispatchId", "Dispatch ID"),
  ],
  output: [
    { key: "data", type: "object", label: "The dispatch" },
  ],

  execute(input, ctx) {
    return new GoCanvasClient(ctx).request(`/dispatches/${encodeId(input.dispatchId)}`);
  },
};

export default dispatchGet;
