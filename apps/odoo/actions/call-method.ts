import type { ActionDefinition } from "@w6w/types";
import { OdooClient } from "../lib/client.ts";

interface Input {
  model: string;
  method: string;
  args?: unknown;
  kwargs?: unknown;
}

/**
 * `execute_kw` with the model, method and arguments supplied by the caller —
 * the general escape hatch.
 *
 * ## Why this belongs in the app
 *
 * Odoo's external API IS `execute_kw`. Every other action here is this call with
 * the model and method fixed and the arguments shaped by a form. An ERP has far
 * more business operations than any pack can wrap — `action_confirm`,
 * `action_cancel`, `action_post`, `button_validate`, plus whatever a customer's
 * own modules define — and Odoo's documentation actively steers integrators
 * toward them, because a single method call is one transaction while a sequence
 * of field writes is not.
 *
 * Without this action, the honest description of the app would be "Odoo, but
 * only the six models we thought of". With it, the named actions become
 * ergonomic shortcuts rather than a ceiling.
 *
 * ## What it does NOT do
 *
 * It does not widen access. `execute_kw` is validated against the connected
 * user's record rules and field permissions exactly as every other call is, so
 * this action can reach nothing that user could not already reach. The way to
 * constrain it is the way Odoo intends: connect a bot user with only the rights
 * the integration needs.
 *
 * ## `idempotent: false`
 *
 * The only honest answer. The method is chosen at runtime, so this action cannot
 * know whether it was given `search_read` or `unlink`. Declaring it safe to
 * retry would be a promise about arbitrary caller-supplied code.
 */
const callMethod: ActionDefinition<Input> = {
  key: "call-method",
  type: "perform",
  title: "Call Method",
  description: "Call any method on any Odoo model via `execute_kw` — business actions like " +
    "`action_confirm`, or methods from custom modules. Positional arguments go in Args, keyword " +
    "arguments in Kwargs. Runs with exactly the connected user's permissions.",
  idempotent: false,
  params: [
    {
      key: "model",
      label: "Model",
      type: "string",
      required: true,
      placeholder: "sale.order",
      hint: "Technical model name, as returned by List Models.",
    },
    {
      key: "method",
      label: "Method",
      type: "string",
      required: true,
      placeholder: "action_confirm",
      hint: "The ORM or business method to call. Odoo blocks methods whose name starts with `_`, " +
        "so private helpers are not reachable.",
    },
    {
      key: "args",
      label: "Args (positional)",
      type: "json",
      default: [],
      hint:
        "JSON array of positional arguments. For a method acting on records, the FIRST element " +
        "is the id list — e.g. `[[69]]` to act on record 69.",
    },
    {
      key: "kwargs",
      label: "Kwargs (keyword)",
      type: "json",
      default: {},
      hint:
        'JSON object of keyword arguments, e.g. `{"fields":["name"],"limit":10}`. Pass Odoo\'s ' +
        'per-call context here too, as `{"context":{"lang":"en_US"}}`.',
    },
  ],
  // `OutputField.type` has no "any", and this action genuinely cannot know:
  // `search_read` returns an array, `write` a boolean, `create` a number, an
  // `action_*` method usually a dict. `object` is declared as the least-wrong
  // container for an arbitrary JSON value, and the label says so plainly rather
  // than implying a shape callers can rely on.
  output: [{
    key: "result",
    type: "object",
    label: "Whatever the method returned — any JSON value, shape depends on the method",
  }],

  async execute(input, ctx) {
    const args = coerceArray(input.args, "Args (positional)");
    const kwargs = coerceObject(input.kwargs, "Kwargs (keyword)");

    const result = await OdooClient.fromConnection(ctx).call<unknown>(
      input.model,
      input.method,
      args,
      kwargs,
    );
    return { result };
  },
};

/** Accept either a parsed array or the raw JSON string a host may pass through. */
function coerceArray(value: unknown, label: string): unknown[] {
  if (value === undefined || value === null || value === "") return [];
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON.`);
    }
  }
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
  return parsed;
}

/** Accept either a parsed object or the raw JSON string a host may pass through. */
function coerceObject(value: unknown, label: string): Record<string, unknown> {
  if (value === undefined || value === null || value === "") return {};
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error(`${label} is not valid JSON.`);
    }
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON object.`);
  }
  return parsed as Record<string, unknown>;
}

export default callMethod;
