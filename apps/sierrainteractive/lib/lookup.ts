import type { ActionDefinition } from "@w6w/types";
import { SierraClient } from "./client.ts";

export interface LookupSpec {
  key: string;
  title: string;
  description: string;
  /** Path under the API root, e.g. `/zapier/agents`. */
  path: string;
}

/** A parameterless `GET` reference-list action; returns the vendor body under `data`. */
export function lookupAction(spec: LookupSpec): ActionDefinition<Record<string, never>> {
  return {
    key: spec.key,
    type: "read",
    resource: "reference",
    title: spec.title,
    description: spec.description,
    params: [],
    output: [{ key: "data", type: "array", label: "The list exactly as Sierra returns it" }],
    async execute(_input, ctx) {
      return await new SierraClient(ctx).get(spec.path);
    },
  };
}
