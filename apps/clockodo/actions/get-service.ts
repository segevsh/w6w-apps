import type { ActionDefinition } from "@w6w/types";
import { ClockodoClient, intId } from "../lib/client.ts";

interface Input {
  id: string;
}

const getService: ActionDefinition<Input> = {
  key: "get-service",
  type: "read",
  resource: "service",
  title: "Get Service",
  description: "Read one service by id (GET /v4/services/{id}).",
  params: [
    {
      key: "id",
      label: "Service ID",
      type: "string",
      required: true,
    },
  ],
  output: [
    { key: "data", type: "object", label: "Service" },
  ],

  async execute(input, ctx) {
    const id = intId(input.id, "id");
    const body = await new ClockodoClient(ctx).call(`/v4/services/${id}`);
    return { data: body.data ?? null };
  },
};

export default getService;
