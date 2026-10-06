import type { ActionDefinition } from "@w6w/types";
import { encodeId, MaintainXClient } from "../lib/client.ts";
import { idParam, organizationIdParam } from "../lib/params.ts";

/** `GET /v1/assets/{id}` — wraps the entity as `{ asset }`; unwrapped here. */
interface Input {
  assetId: number;
  organizationId?: number;
}

const assetGet: ActionDefinition<Input> = {
  key: "asset-get",
  type: "read",
  resource: "asset",
  title: "Get Asset",
  description: "Fetch one asset by id.",
  params: [idParam("assetId", "Asset ID"), organizationIdParam],
  output: [{ key: "data", type: "object", label: "The asset" }],

  execute(input, ctx) {
    return new MaintainXClient(ctx).entity(`/assets/${encodeId(input.assetId)}`, "asset", {
      organizationId: input.organizationId,
    });
  },
};

export default assetGet;
