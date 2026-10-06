import type { ActionDefinition } from "@w6w/types";
import { encodeId, HexClient } from "../lib/client.ts";

/** `GET /v1/data-connections/{dataConnectionId}` — one warehouse connection. */
interface Input {
  dataConnectionId: string;
}

const dataConnectionGet: ActionDefinition<Input> = {
  key: "data-connection-get",
  type: "read",
  resource: "data-connection",
  title: "Get Data Connection",
  description: "Fetch one data-warehouse connection by id.",
  params: [{
    key: "dataConnectionId",
    label: "Data connection ID",
    type: "string",
    required: true,
  }],
  output: [
    { key: "id", type: "string", label: "Data connection ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "type", type: "string", label: "Warehouse type" },
    { key: "sensitivity", type: "object", label: "Sensitivity flags" },
  ],

  execute(input, ctx) {
    return new HexClient(ctx).json(`/data-connections/${encodeId(input.dataConnectionId)}`);
  },
};

export default dataConnectionGet;
