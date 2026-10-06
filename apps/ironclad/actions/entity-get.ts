import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { entityIdParam } from "../lib/params.ts";

interface Input {
  entityId: string;
}

const entityGet: ActionDefinition<Input> = {
  key: "entity-get",
  type: "read",
  resource: "entity",
  title: "Get Entity",
  description: "Fetch one entity with its status, relationship types and properties.",
  params: [entityIdParam],
  output: [
    { key: "id", type: "string", label: "Entity ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "properties", type: "object", label: "Properties" },
  ],

  execute(input, ctx) {
    return new IroncladClient(ctx).json(`/entities/${encodeId(input.entityId)}`);
  },
};

export default entityGet;
