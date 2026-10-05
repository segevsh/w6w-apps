/**
 * Factories for the two shapes that make up most of this app — a paginated list
 * and a get-by-id — so the wire contract (query names, `next_link` handling,
 * redacted-field reporting) lives in exactly one place. Each action file still
 * default-exports its own `ActionDefinition`.
 */
import type { ActionDefinition, Param } from "@w6w/types";
import {
  cursorFromLink,
  encodeId,
  normalizeCursor,
  RipplingClient,
  type RipplingListBody,
  toCsv,
} from "./client.ts";
import {
  cursorParam,
  expandParam,
  filterParam,
  idParam,
  limitParam,
  orderByParam,
} from "./params.ts";

export interface ListInput {
  limit?: number;
  cursor?: string;
  filter?: string;
  expand?: string;
  orderBy?: string;
  [key: string]: unknown;
}

export interface ListSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string;
  scope: string;
  filterable?: string[];
  expandable?: string[];
  sortable?: string[];
}

export const STD_SORT = ["id", "created_at", "updated_at"];

export function listAction(spec: ListSpec): ActionDefinition<ListInput> {
  const params: Param[] = [];
  if (spec.filterable?.length) params.push(filterParam(spec.filterable));
  if (spec.expandable?.length) params.push(expandParam(spec.expandable));
  params.push(orderByParam(spec.sortable ?? STD_SORT), limitParam, cursorParam);
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: `${spec.description} Requires the \`${spec.scope}\` scope on the API token.`,
    params,
    output: [
      { key: "results", type: "array", label: "Records on this page" },
      { key: "nextCursor", type: "string", label: "Cursor for the next page (null on the last)" },
      {
        key: "nextLink",
        type: "string",
        label: "Rippling's next_link URL (null on the last page)",
      },
      {
        key: "redactedFields",
        type: "array",
        label: "Fields hidden from this token (name + reason)",
      },
    ],
    async execute(input, ctx) {
      const body = await new RipplingClient(ctx).json<RipplingListBody>(spec.path, {
        query: {
          filter: input.filter?.trim(),
          expand: toCsv(input.expand),
          order_by: input.orderBy?.trim(),
          limit: input.limit,
          cursor: normalizeCursor(input.cursor),
        },
      });
      const nextLink = body?.next_link ?? null;
      return {
        results: body?.results ?? [],
        nextCursor: cursorFromLink(nextLink),
        nextLink,
        redactedFields: body?.__meta?.redacted_fields ?? [],
      };
    },
  };
}

export interface GetSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string; // e.g. "/workers" — the id is appended
  scope: string;
  expandable?: string[];
}

export interface GetInput {
  id: string;
  expand?: string;
}

export function getAction(spec: GetSpec): ActionDefinition<GetInput> {
  const params: Param[] = [idParam];
  if (spec.expandable?.length) params.push(expandParam(spec.expandable));
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: `${spec.description} Requires the \`${spec.scope}\` scope on the API token.`,
    params,
    output: [
      { key: "id", type: "string", label: "ID" },
      { key: "created_at", type: "string", label: "Created at" },
      { key: "updated_at", type: "string", label: "Updated at" },
    ],
    execute(input, ctx) {
      if (!String(input.id ?? "").trim()) throw new Error("id is required");
      return new RipplingClient(ctx).json(`${spec.path}/${encodeId(input.id)}/`, {
        query: { expand: toCsv(input.expand) },
      });
    },
  };
}

export interface WriteSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  path: string; // collection path without trailing slash, e.g. "/departments"
  scope: string;
  /** Body members: input key -> wire key (all optional unless the Param says required). */
  fields: Array<{ param: Param; wire: string; transform?: (v: unknown) => unknown }>;
}

function buildBody(spec: WriteSpec, input: Record<string, unknown>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of spec.fields) {
    const raw = input[f.param.key];
    if (raw === undefined || raw === null || raw === "") continue;
    body[f.wire] = f.transform ? f.transform(raw) : raw;
  }
  return body;
}

function requireFields(spec: WriteSpec, input: Record<string, unknown>) {
  for (const f of spec.fields) {
    if (!f.param.required) continue;
    const v = input[f.param.key];
    if (v === undefined || v === null || String(v).trim() === "") {
      throw new Error(`${f.param.key} is required`);
    }
  }
}

const RESULT_OUTPUT = [
  { key: "id", type: "string", label: "ID" },
  { key: "created_at", type: "string", label: "Created at" },
  { key: "updated_at", type: "string", label: "Updated at" },
] as const;

export function createAction(spec: WriteSpec): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: `${spec.description} Requires the \`${spec.scope}\` scope on the API token. ` +
      "Not idempotent: Rippling documents no idempotency key, so a retry may create a duplicate.",
    idempotent: false,
    params: spec.fields.map((f) => f.param),
    output: [...RESULT_OUTPUT],
    execute(input, ctx) {
      requireFields(spec, input);
      return new RipplingClient(ctx).json(`${spec.path}/`, {
        method: "POST",
        body: buildBody(spec, input),
      });
    },
  };
}

export function updateAction(spec: WriteSpec): ActionDefinition<Record<string, unknown>> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: `${spec.description} Requires the \`${spec.scope}\` scope on the API token. ` +
      "A PATCH: only the fields you set are sent, everything else is left as it is.",
    idempotent: true,
    params: [idParam, ...spec.fields.map((f) => ({ ...f.param, required: false }))],
    output: [...RESULT_OUTPUT],
    execute(input, ctx) {
      const id = String(input.id ?? "").trim();
      if (!id) throw new Error("id is required");
      const body = buildBody(spec, input);
      if (Object.keys(body).length === 0) throw new Error("set at least one field to update");
      return new RipplingClient(ctx).json(`${spec.path}/${encodeId(id)}/`, {
        method: "PATCH",
        body,
      });
    },
  };
}

export function deleteAction(
  spec: Pick<WriteSpec, "key" | "resource" | "title" | "description" | "path" | "scope">,
): ActionDefinition<{ id: string }> {
  return {
    key: spec.key,
    type: "perform",
    resource: spec.resource,
    title: spec.title,
    description: `${spec.description} Requires the \`${spec.scope}\` scope on the API token. ` +
      "Destructive; Rippling answers 204, and a repeat delete fails with a 404.",
    idempotent: true,
    params: [idParam],
    output: [{ key: "deleted", type: "boolean", label: "True when Rippling answered 204" }],
    async execute(input, ctx) {
      const id = String(input.id ?? "").trim();
      if (!id) throw new Error("id is required");
      await new RipplingClient(ctx).json(`${spec.path}/${encodeId(id)}/`, { method: "DELETE" });
      return { deleted: true };
    },
  };
}
