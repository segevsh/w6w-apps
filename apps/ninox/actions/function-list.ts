import type { ActionDefinition } from "@w6w/types";
import { MODULE_PARAM, NinoxClient, seg } from "../lib/client.ts";

/** `GET .../modules/{moduleName}/functions` — global function scripts, in compile order. */
interface Input {
  moduleName: string;
}

interface Output {
  functions: Array<{ id: string; name: string; moduleName: string; code: string }>;
}

const functionList: ActionDefinition<Input, Output> = {
  key: "function-list",
  type: "read",
  resource: "function",
  title: "List Global Functions",
  description: "List a module's global function scripts (name and code), in the order they " +
    "compile.",
  params: [MODULE_PARAM],
  output: [{ key: "functions", type: "array", label: "Global function scripts" }],

  async execute(input, ctx) {
    const functions = await new NinoxClient(ctx).data<Output["functions"]>(
      `/modules/${seg(input.moduleName)}/functions`,
    );
    return { functions: Array.isArray(functions) ? functions : [] };
  },
};

export default functionList;
