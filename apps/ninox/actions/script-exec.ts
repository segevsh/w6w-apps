import type { ActionDefinition } from "@w6w/types";
import { NinoxClient } from "../lib/client.ts";

/**
 * `POST /workspace/{workspaceId}/script/exec` — runs a Ninox script with writes and trigger
 * cascades enabled. Needs the `records:write` scope (403 otherwise); `do as database` is
 * confined to the named module.
 */
interface Input {
  moduleName: string;
  script: string;
  tableName?: string;
  rowId?: number;
}

interface Output {
  result: unknown;
}

const scriptExec: ActionDefinition<Input, Output> = {
  key: "script-exec",
  type: "perform",
  resource: "script",
  title: "Execute Script",
  description: "Run a Ninox script expression, optionally against one record, and return its " +
    "result. Writes and triggers are enabled, so the script can change data.",
  idempotent: false,
  params: [
    {
      key: "moduleName",
      label: "Module name",
      type: "string",
      required: true,
      hint: "`do as database` inside the script is confined to this module.",
    },
    { key: "script", label: "Script", type: "code", required: true },
    {
      key: "tableName",
      label: "Table name",
      type: "string",
      hint: "With Record ID, the table the script evaluates against.",
    },
    { key: "rowId", label: "Record ID", type: "number", validation: { min: 1, integer: true } },
  ],
  output: [{ key: "result", type: "object", label: "Script result (any JSON value)" }],

  async execute(input, ctx) {
    const script = String(input.script ?? "");
    if (!script.trim()) throw new Error("script is required");
    const body: Record<string, unknown> = { moduleName: input.moduleName, script };
    if (input.tableName) body.tableName = input.tableName;
    if (input.rowId !== undefined && input.rowId !== null) body.rowId = Number(input.rowId);
    const env = await new NinoxClient(ctx).call("/script/exec", { method: "POST", body });
    return { result: env.data };
  },
};

export default scriptExec;
