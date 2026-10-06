import type { ActionDefinition, Param } from "@w6w/types";
import { AcceloClient, type ListInput, type ListResult, type Scalar } from "./client.ts";
import { fieldsParam, listOutput, listRefinements, objectOutput, pagination } from "./params.ts";

/**
 * Accelo's resources share one shape — `GET /{plural}` lists, `GET /{plural}/{id}`
 * reads, `POST /{plural}` creates, `PUT /{plural}/{id}` updates, all answering the
 * `{ meta, response }` envelope the client unwraps. These factories build the
 * Action definitions from a small spec so each resource file states only what is
 * particular to it: its path, its fields, and the wire name Accelo gives each.
 */

export interface ListSpec {
  /** Action key, e.g. `company-list`. */
  key: string;
  /** Resource noun used for grouping, e.g. `company`. */
  resource: string;
  /** Path under `/api/v0`, e.g. `/companies`. */
  path: string;
  title: string;
  description: string;
  /** Extra filter hint specific to this resource, appended to the generic one. */
  filterHint?: string;
}

export function listAction(spec: ListSpec): ActionDefinition<ListInput> {
  const refinements = spec.filterHint
    ? listRefinements.map((p) =>
      p.key === "filters" ? { ...p, hint: `${p.hint} ${spec.filterHint}` } : p
    )
    : listRefinements;
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [...refinements, ...pagination],
    output: listOutput,
    execute(input, ctx): Promise<ListResult> {
      return new AcceloClient(ctx).list(spec.path, input);
    },
  };
}

export interface GetSpec {
  key: string;
  resource: string;
  path: string;
  /** Camel-case input key holding the id, e.g. `companyId`. */
  idKey: string;
  idLabel: string;
  title: string;
  description: string;
}

export function getAction(spec: GetSpec): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: [
      { key: spec.idKey, label: spec.idLabel, type: "number", required: true },
      fieldsParam,
    ],
    output: objectOutput(spec.resource),
    execute(input, ctx) {
      return new AcceloClient(ctx).request(`${spec.path}/${requireId(input[spec.idKey])}`, {
        query: { _fields: stringOrUndefined(input.fields) },
      });
    },
  };
}

/** One writable field: the form key the user sees, the name Accelo expects, and its Param shape. */
export interface FieldSpec {
  /** Input key (camelCase). */
  key: string;
  /** Wire name — Accelo's own snake_case field. */
  wire: string;
  label: string;
  type?: "string" | "text" | "number" | "boolean" | "select";
  required?: boolean;
  hint?: string;
  placeholder?: string;
  advanced?: boolean;
  row?: string;
  options?: Array<{ value: string; label: string }>;
  /** How a boolean travels: Accelo documents both `yes`/`no` and `true`/`false` on different fields. */
  bool?: "yesno" | "truefalse";
}

export function toParam(f: FieldSpec): Param {
  const p: Record<string, unknown> = {
    key: f.key,
    label: f.label,
    type: f.type ?? "string",
  };
  if (f.required) p.required = true;
  if (f.hint) p.hint = f.hint;
  if (f.placeholder) p.placeholder = f.placeholder;
  if (f.advanced) p.advanced = true;
  if (f.row) p.row = f.row;
  if (f.options) p.options = f.options;
  if (f.type === "text") p.config = { multiline: true };
  return p as unknown as Param;
}

/** Map the user's inputs onto Accelo's wire names, dropping anything left unset. */
export function toForm(
  fields: FieldSpec[],
  input: Record<string, unknown>,
): Record<string, Scalar> {
  const form: Record<string, Scalar> = {};
  for (const f of fields) {
    const v = input[f.key];
    if (v === undefined || v === null || v === "") continue;
    if (typeof v === "boolean") {
      form[f.wire] = f.bool === "truefalse" ? String(v) : v ? "yes" : "no";
    } else {
      form[f.wire] = v as Scalar;
    }
  }
  return form;
}

export interface CreateSpec {
  key: string;
  resource: string;
  path: string;
  title: string;
  description: string;
  fields: FieldSpec[];
}

export function createAction(spec: CreateSpec): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    // Accelo mints a new id per POST and offers no idempotency key.
    idempotent: false,
    params: [...spec.fields.map(toParam), fieldsParam],
    output: objectOutput(spec.resource),
    execute(input, ctx) {
      return new AcceloClient(ctx).request(spec.path, {
        method: "POST",
        form: { ...toForm(spec.fields, input), _fields: stringOrUndefined(input.fields) },
      });
    },
  };
}

export interface UpdateSpec extends CreateSpec {
  idKey: string;
  idLabel: string;
}

export function updateAction(spec: UpdateSpec): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    // A PUT of the same values converges, so a retry is safe.
    idempotent: true,
    params: [
      { key: spec.idKey, label: spec.idLabel, type: "number", required: true },
      ...spec.fields.map(toParam),
      fieldsParam,
    ],
    output: objectOutput(spec.resource),
    execute(input, ctx) {
      const form = toForm(spec.fields, input);
      if (Object.keys(form).length === 0) {
        throw new Error(`${spec.title}: set at least one field to change.`);
      }
      return new AcceloClient(ctx).request(`${spec.path}/${requireId(input[spec.idKey])}`, {
        method: "PUT",
        form: { ...form, _fields: stringOrUndefined(input.fields) },
      });
    },
  };
}

function requireId(v: unknown): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error("A positive numeric id is required.");
  return n;
}

function stringOrUndefined(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
