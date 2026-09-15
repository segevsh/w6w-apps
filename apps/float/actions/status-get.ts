import type { ActionDefinition } from "@w6w/types";
import { FloatClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/** `GET /v3/status/{status_id}` — retrieve a single status. */
interface Input {
  status_id: number;
}

const statusGet: ActionDefinition<Input> = {
  key: "status-get",
  type: "read",
  resource: "status",
  title: "Get Status",
  description: "Retrieve a single status by ID.",
  params: [idParam("status_id", "Status ID")],
  output: [
    { key: "status_id", type: "number", label: "Status ID" },
    { key: "people_id", type: "number", label: "Person ID" },
  ],

  async execute(input, ctx) {
    return await new FloatClient(ctx).json(`/status/${input.status_id}`);
  },
};

export default statusGet;
