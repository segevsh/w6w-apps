import type { ActionDefinition, Param } from "@w6w/types";
import { paging, pathId, type QueryValue, type Service, toPage, WorkdayClient } from "./client.ts";

/** Paging params shared by every collection read. */
export const PAGING_PARAMS: Param[] = [
  {
    key: "limit",
    label: "Limit",
    type: "number",
    hint: "Objects per response. Workday's default is 20 and its maximum is 100.",
    validation: { min: 1, max: 100, integer: true },
  },
  {
    key: "offset",
    label: "Offset",
    type: "number",
    hint: "Zero-based index of the first object. Page with offset += limit while `hasMore`.",
    validation: { min: 0, integer: true },
  },
];

export function idParam(key: string, label: string, hint: string): Param {
  return { key, label, type: "string", required: true, hint };
}

export const WORKER_ID_HINT =
  "A 32-character Workday ID, a reference ID such as Employee_ID=21001, or `me`. " +
  "Take the `id` from a Workers list.";

export const LIST_OUTPUT = [
  { key: "items", type: "array" as const, label: "The objects on this page" },
  { key: "count", type: "number" as const, label: "Objects on this page" },
  { key: "total", type: "number" as const, label: "Objects matching in all, across pages" },
  { key: "hasMore", type: "boolean" as const, label: "True when another page follows" },
];

interface BaseSpec {
  key: string;
  resource: string;
  title: string;
  description: string;
  service: Service;
  /** Path under the service, `{ID}` is replaced by the validated ID. */
  path: string;
  /** The input key that fills `{ID}` — its param is generated. */
  idKey?: string;
  idLabel?: string;
  idHint?: string;
  params?: Param[];
  query?: (input: Record<string, unknown>) => Record<string, QueryValue>;
}

function resolvePath(spec: BaseSpec, input: Record<string, unknown>): string {
  if (!spec.idKey) return spec.path;
  return spec.path.replace("{ID}", pathId(input[spec.idKey], spec.idKey));
}

function baseParams(spec: BaseSpec, withPaging: boolean): Param[] {
  return [
    ...(spec.idKey
      ? [idParam(spec.idKey, spec.idLabel ?? "ID", spec.idHint ?? WORKER_ID_HINT)]
      : []),
    ...(spec.params ?? []),
    ...(withPaging ? PAGING_PARAMS : []),
  ];
}

/** A paged `GET` collection returning `{ items, count, total, hasMore }`. */
export function listAction(spec: BaseSpec): ActionDefinition {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: baseParams(spec, true),
    output: LIST_OUTPUT,
    async execute(input, ctx) {
      const i = input as Record<string, unknown>;
      const path = resolvePath(spec, i);
      const page = paging(i);
      const body = await new WorkdayClient(ctx).request(spec.service, path, {
        query: { ...(spec.query?.(i) ?? {}), ...page },
      });
      return toPage(body, page.offset ?? 0);
    },
  };
}

/** A single-resource `GET` returning `{ record }`. */
export function getAction(spec: BaseSpec): ActionDefinition {
  return {
    key: spec.key,
    type: "read",
    resource: spec.resource,
    title: spec.title,
    description: spec.description,
    params: baseParams(spec, false),
    output: [{ key: "record", type: "object", label: "The resource as Workday returns it" }],
    async execute(input, ctx) {
      const i = input as Record<string, unknown>;
      const body = await new WorkdayClient(ctx).request(spec.service, resolvePath(spec, i), {
        query: spec.query?.(i),
      });
      return { record: body };
    },
  };
}
