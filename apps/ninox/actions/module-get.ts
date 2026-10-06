import type { ActionDefinition } from "@w6w/types";
import { MODULE_PARAM, NinoxClient, seg } from "../lib/client.ts";

/** `GET /workspace/{workspaceId}/modules/{moduleName}`. */
interface Input {
  moduleName: string;
}

interface Output {
  module: unknown;
}

const moduleGet: ActionDefinition<Input, Output> = {
  key: "module-get",
  type: "read",
  resource: "module",
  title: "Get Module",
  description: "Read one module's definition: its tables, components, roles and labels.",
  params: [MODULE_PARAM],
  output: [{ key: "module", type: "object", label: "Module" }],

  async execute(input, ctx) {
    return { module: await new NinoxClient(ctx).data(`/modules/${seg(input.moduleName)}`) };
  },
};

export default moduleGet;
