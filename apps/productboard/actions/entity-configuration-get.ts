import type { ActionDefinition } from "@w6w/types";
import { type DataResult, encodeId, ProductboardClient } from "../lib/client.ts";
import { entityTypeOptions } from "../lib/params.ts";

/**
 * `GET /v2/entities/configurations/{type}` — the configuration for one entity
 * type.
 *
 * The single-type form of `entity-configuration-list`. Worth its own action
 * because the usual shape of the question is "what can I set on a feature?",
 * and pulling eleven configurations to answer it is a waste of the one thing
 * this API meters.
 */
interface Input {
  type: string;
}

const entityConfigurationGet: ActionDefinition<Input, DataResult> = {
  key: "entity-configuration-get",
  type: "read",
  resource: "entity",
  title: "Get entity configuration",
  description:
    "Fields, types, validation rules and supported patch operations for one entity type in this " +
    "workspace.",
  params: [
    {
      key: "type",
      label: "Entity type",
      type: "select",
      required: true,
      options: entityTypeOptions,
    },
  ],
  output: [{ key: "data", type: "object", label: "Configuration" }],

  async execute(input, ctx) {
    const data = await new ProductboardClient(ctx).data(
      `/entities/configurations/${encodeId(input.type)}`,
    );
    return { data };
  },
};

export default entityConfigurationGet;
