import type { ActionDefinition, Param } from "@w6w/types";
import { AutotaskClient, compact, jsonObject } from "./client.ts";

/** One typed field of an entity, as it appears in the Autotask model. */
export interface Field {
  key: string;
  label: string;
  type: "string" | "text" | "number" | "boolean" | "datetime";
  /** Required on CREATE, per the vendor's entity page. Updates never require a field. */
  required?: boolean;
  hint?: string;
}

export interface WriteSpec {
  key: string;
  title: string;
  description: string;
  resource: string;
  /** `POST` creates, `PATCH` changes only the fields sent. */
  method: "POST" | "PATCH";
  /** Root path of the entity, or of the child collection once `parent` is substituted. */
  path: string | ((parent: string | number) => string);
  /** For a child entity, the parent id: it is in the URL and, as the vendor's examples do, the body. */
  parent?: Field;
  fields: Field[];
  /** Hint appended to the free-form `fields` param. */
  extraHint?: string;
}

const EXTRA_HINT = "JSON object of any other field of the entity, or a `userDefinedFields` array " +
  '(`{"userDefinedFields":[{"name":"MyField","value":"x"}]}`). Typed params above win on conflict.';

function param(field: Field, required: boolean): Param {
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    required,
    ...(field.hint ? { hint: field.hint } : {}),
  } as Param;
}

/** Coerce a form value to what the API expects for the field's type. */
export function coerce(field: Field, value: unknown): unknown {
  if (value === undefined || value === null || value === "") return undefined;
  if (field.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) throw new Error(`\`${field.key}\` must be a number`);
    return n;
  }
  if (field.type === "boolean") {
    if (typeof value === "string") return value.toLowerCase() === "true";
    return Boolean(value);
  }
  return value;
}

/** Build a create or update action for one entity. */
export function writeAction(spec: WriteSpec): ActionDefinition {
  const update = spec.method === "PATCH";
  const params: Param[] = [];
  if (update) {
    params.push(
      {
        key: "id",
        label: "ID",
        type: "number",
        required: true,
        hint: "The record's `id`.",
      } as Param,
    );
  }
  if (spec.parent) params.push(param(spec.parent, true));
  for (const field of spec.fields) params.push(param(field, update ? false : !!field.required));
  params.push({
    key: "fields",
    label: "Other fields (JSON)",
    type: "json",
    hint: spec.extraHint ?? EXTRA_HINT,
  } as Param);

  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    // A create makes a new row on every call; a PATCH sets the same values again.
    idempotent: update,
    params,
    output: [
      { key: "id", type: "number", label: "Record id" },
      { key: "itemId", type: "number", label: "Record id as the API reports it" },
    ],

    async execute(input, ctx) {
      const i = input as Record<string, unknown>;
      const client = new AutotaskClient(ctx);

      const body: Record<string, unknown> = { ...(jsonObject(i.fields, "fields") ?? {}) };
      for (const field of spec.fields) {
        const value = coerce(field, i[field.key]);
        if (value !== undefined) body[field.key] = value;
      }

      let path: string;
      if (spec.parent) {
        const parentId = coerce(spec.parent, i[spec.parent.key]);
        if (parentId === undefined) throw new Error(`\`${spec.parent.key}\` is required`);
        body[spec.parent.key] = parentId;
        path = typeof spec.path === "function" ? spec.path(parentId as number) : spec.path;
      } else {
        path = spec.path as string;
      }

      let id: number | undefined;
      if (update) {
        id = coerce({ key: "id", label: "ID", type: "number" }, i.id) as number | undefined;
        if (id === undefined) throw new Error("`id` is required");
        if (Object.keys(compact(body)).filter((k) => k !== spec.parent?.key).length === 0) {
          throw new Error("nothing to update — set at least one field");
        }
        body.id = id;
      }

      const res = await client.write(spec.method, path, compact(body));
      const resultId = res.itemId ?? id;
      return { id: resultId, itemId: res.itemId };
    },
  };
}
