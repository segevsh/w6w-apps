import type { ActionDefinition } from "@w6w/types";
import { NinoxClient, seg } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}/views/{viewId}`. */
interface Input {
  viewId: string;
}

interface Output {
  view: unknown;
}

const viewGet: ActionDefinition<Input, Output> = {
  key: "view-get",
  type: "read",
  resource: "view",
  title: "Get View",
  description: "Read one view's definition by its id.",
  params: [{ key: "viewId", label: "View ID", type: "string", required: true }],
  output: [{ key: "view", type: "object", label: "View" }],

  async execute(input, ctx) {
    return { view: await new NinoxClient(ctx).data(`/views/${seg(input.viewId)}`) };
  },
};

export default viewGet;
