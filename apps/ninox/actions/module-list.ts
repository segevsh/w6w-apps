import type { ActionDefinition } from "@w6w/types";
import { LIMIT_PARAM, NinoxClient, OFFSET_PARAM } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}/modules` — modules with their definitions. */
interface Input {
  limit?: number;
  offset?: number;
}

interface Output {
  modules: unknown[];
  hasMore: boolean;
}

const moduleList: ActionDefinition<Input, Output> = {
  key: "module-list",
  type: "read",
  resource: "module",
  title: "List Modules",
  description: "List the modules in the workspace (each carries its tables, components and roles).",
  params: [LIMIT_PARAM, OFFSET_PARAM],
  output: [
    { key: "modules", type: "array", label: "Modules" },
    { key: "hasMore", type: "boolean", label: "More pages available" },
  ],

  async execute(input, ctx) {
    const { items, hasMore } = await new NinoxClient(ctx).list("/modules", {
      limit: input.limit,
      offset: input.offset,
    });
    return { modules: items, hasMore };
  },
};

export default moduleList;
