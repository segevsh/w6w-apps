import type { ActionDefinition } from "@w6w/types";
import { encodeId, IroncladClient } from "../lib/client.ts";
import { entityIdParam } from "../lib/params.ts";

interface Input {
  entityId: string;
}

const entityDelete: ActionDefinition<Input> = {
  key: "entity-delete",
  type: "perform",
  resource: "entity",
  title: "Delete Entity",
  description: "Delete a legal entity.",
  idempotent: false,
  params: [entityIdParam],
  output: [{ key: "deleted", type: "boolean", label: "Whether the entity was deleted" }, {
    key: "entityId",
    type: "string",
    label: "Entity ID",
  }],

  async execute(input, ctx) {
    await new IroncladClient(ctx).json(`/entities/${encodeId(input.entityId)}`, {
      method: "DELETE",
    });
    return { deleted: true, entityId: input.entityId };
  },
};

export default entityDelete;
