/**
 * The two wire shapes the Firestore actions have to *build* rather than pass
 * through: `StructuredQuery` (for `query-run` and `query-run-aggregation`) and
 * `Write[]` (for `documents-commit` and `documents-batch-write`).
 *
 * Both are built here so the simplified input vocabulary lives in one place and
 * is the same in every action that shares it.
 */
import { encodeFields, parseJson, toValue } from "./client.ts";
import { fieldPaths } from "./params.ts";

/** A simplified filter: `{field, op, value}`. */
export interface QueryFilter {
  field?: string;
  op?: string;
  value?: unknown;
}

/** A simplified ordering: `{field, direction}`. */
export interface QueryOrder {
  field?: string;
  direction?: string;
}

/**
 * Firestore's `FieldFilter.Operator`, reachable through either the enum name or
 * the operator a person would write. The enum values are taken verbatim from
 * the discovery doc's `schemas.FieldFilter.op`.
 */
const FIELD_OPS: Record<string, string> = {
  "<": "LESS_THAN",
  "<=": "LESS_THAN_OR_EQUAL",
  ">": "GREATER_THAN",
  ">=": "GREATER_THAN_OR_EQUAL",
  "=": "EQUAL",
  "==": "EQUAL",
  "!=": "NOT_EQUAL",
  "<>": "NOT_EQUAL",
  "array-contains": "ARRAY_CONTAINS",
  "array-contains-any": "ARRAY_CONTAINS_ANY",
  in: "IN",
  "not-in": "NOT_IN",
  LESS_THAN: "LESS_THAN",
  LESS_THAN_OR_EQUAL: "LESS_THAN_OR_EQUAL",
  GREATER_THAN: "GREATER_THAN",
  GREATER_THAN_OR_EQUAL: "GREATER_THAN_OR_EQUAL",
  EQUAL: "EQUAL",
  NOT_EQUAL: "NOT_EQUAL",
  ARRAY_CONTAINS: "ARRAY_CONTAINS",
  ARRAY_CONTAINS_ANY: "ARRAY_CONTAINS_ANY",
  IN: "IN",
  NOT_IN: "NOT_IN",
};

/** `UnaryFilter.Operator` — the null/NaN tests, which take no value. */
const UNARY_OPS: Record<string, string> = {
  "is-null": "IS_NULL",
  "is-null-or-missing": "IS_NULL",
  "is-nan": "IS_NAN",
  "is-not-null": "IS_NOT_NULL",
  "is-not-nan": "IS_NOT_NAN",
  IS_NULL: "IS_NULL",
  IS_NAN: "IS_NAN",
  IS_NOT_NULL: "IS_NOT_NULL",
  IS_NOT_NAN: "IS_NOT_NAN",
};

/** `Order.direction`. */
const DIRECTIONS: Record<string, string> = {
  asc: "ASCENDING",
  ascending: "ASCENDING",
  ASCENDING: "ASCENDING",
  desc: "DESCENDING",
  descending: "DESCENDING",
  DESCENDING: "DESCENDING",
};

function asList(value: unknown, field: string): unknown[] {
  const parsed = parseJson(value, field);
  if (parsed === undefined || parsed === null) return [];
  if (!Array.isArray(parsed)) throw new Error(`\`${field}\` must be a JSON array`);
  return parsed;
}

/** One `{field, op, value}` → a `Filter` (`FieldFilter` or `UnaryFilter`). */
export function buildFilter(raw: QueryFilter): Record<string, unknown> {
  const field = String(raw?.field ?? "").trim();
  if (!field) throw new Error("every filter needs a `field`");
  const opRaw = String(raw?.op ?? "EQUAL").trim();
  const unary = UNARY_OPS[opRaw];
  if (unary) {
    return { unaryFilter: { op: unary, field: { fieldPath: field } } };
  }
  const op = FIELD_OPS[opRaw];
  if (!op) {
    throw new Error(
      `\`${opRaw}\` is not a Firestore filter operator — use one of <, <=, >, >=, ==, !=, ` +
        `array-contains, array-contains-any, in, not-in, is-null, is-nan, is-not-null, is-not-nan`,
    );
  }
  if (raw.value === undefined || raw.value === null) {
    throw new Error(`filter on \`${field}\` is missing a \`value\``);
  }
  return { fieldFilter: { field: { fieldPath: field }, op, value: toValue(raw.value) } };
}

/**
 * The `where` of a query.
 *
 * `undefined` for no filters; a bare filter for exactly one (no pointless
 * `CompositeFilter` around it); an `AND` composite for two or more. `OR` is
 * deliberately not reachable from this app's input — see the README.
 */
export function buildWhere(filters: unknown): Record<string, unknown> | undefined {
  const list = asList(filters, "filters") as QueryFilter[];
  if (list.length === 0) return undefined;
  const built = list.map((f) => buildFilter(f));
  if (built.length === 1) return built[0];
  return { compositeFilter: { op: "AND", filters: built } };
}

/** `orderBy` — `[{field, direction}]` → `Order[]`. Defaults to ascending. */
export function buildOrderBy(orderBy: unknown): Array<Record<string, unknown>> | undefined {
  const list = asList(orderBy, "orderBy") as QueryOrder[];
  if (list.length === 0) return undefined;
  return list.map((o) => {
    const field = String(o?.field ?? "").trim();
    if (!field) throw new Error("every `orderBy` entry needs a `field`");
    const direction = DIRECTIONS[String(o?.direction ?? "ascending")];
    if (!direction) {
      throw new Error("`orderBy` direction must be `ascending` or `descending`");
    }
    return { field: { fieldPath: field }, direction };
  });
}

/** `limit` — a non-negative integer, or `undefined` when unset. */
export function buildLimit(limit: unknown): number | undefined {
  if (limit === undefined || limit === null || limit === "") return undefined;
  const n = Number(limit);
  if (!Number.isInteger(n) || n < 0) throw new Error("`limit` must be a non-negative integer");
  return n;
}

/**
 * The `StructuredQuery` both query actions send.
 *
 * `from` is a single `CollectionSelector`; `allDescendants` is what turns it
 * into a collection-group query (a subcollection id matched anywhere under the
 * parent).
 */
export function buildStructuredQuery(input: {
  collectionId: string;
  allDescendants?: unknown;
  filters?: unknown;
  orderBy?: unknown;
  limit?: unknown;
}): Record<string, unknown> {
  const selector: Record<string, unknown> = { collectionId: input.collectionId };
  if (input.allDescendants === true) selector.allDescendants = true;
  const query: Record<string, unknown> = { from: [selector] };
  const where = buildWhere(input.filters);
  if (where) query.where = where;
  const orderBy = buildOrderBy(input.orderBy);
  if (orderBy) query.orderBy = orderBy;
  const limit = buildLimit(input.limit);
  if (limit !== undefined) query.limit = limit;
  return query;
}

// ------------------------------------------------------------------ writes --

/** A simplified write entry: `{op, path, data?, mask?, exists?, updateTime?}`. */
export interface WriteEntry {
  op?: string;
  path?: string;
  data?: unknown;
  mask?: unknown;
  exists?: unknown;
  updateTime?: unknown;
}

/**
 * One simplified entry → one `Write`.
 *
 * The vocabulary is `set` (replace the whole document), `update` (write only
 * the fields in `mask`, leaving the rest — and deleting any masked field the
 * data omits, which is what an `updateMask` means to Firestore) and `delete`.
 * The wire form has one arm for the first two, `Write.update`; the difference
 * is the presence of `updateMask`, exactly as the discovery doc describes it.
 */
export function buildWrite(
  entry: WriteEntry,
  nameOf: (path: string) => string,
): Record<string, unknown> {
  const op = String(entry?.op ?? "").trim().toLowerCase();
  const path = String(entry?.path ?? "").trim();
  if (!path) throw new Error("every write needs a document `path`");
  const name = nameOf(path);

  const precondition: Record<string, unknown> = {};
  if (entry.exists !== undefined && entry.exists !== null && entry.exists !== "") {
    precondition.exists = entry.exists === true || entry.exists === "true";
  }
  if (entry.updateTime) precondition.updateTime = String(entry.updateTime);

  if (op === "delete") {
    const write: Record<string, unknown> = { delete: name };
    if (Object.keys(precondition).length) write.currentDocument = precondition;
    return write;
  }

  if (op !== "set" && op !== "update") {
    throw new Error(
      `\`${op || "(blank)"}\` is not a write op — use \`set\`, \`update\` or \`delete\``,
    );
  }

  const data = parseJson(entry.data, "data");
  if (data === undefined || data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`write on \`${path}\` needs \`data\` as a JSON object`);
  }

  const write: Record<string, unknown> = {
    update: { name, fields: encodeFields(data as Record<string, unknown>) },
  };
  const mask = fieldPaths(entry.mask);
  if (op === "update") {
    if (!mask) {
      throw new Error(
        `\`update\` on \`${path}\` needs \`mask\` — the field paths to write. Use \`set\` to ` +
          `replace the whole document.`,
      );
    }
    write.updateMask = { fieldPaths: mask };
  } else if (mask) {
    throw new Error(
      `\`set\` on \`${path}\` must not carry \`mask\` — use \`update\` for a partial write`,
    );
  }
  if (Object.keys(precondition).length) write.currentDocument = precondition;
  return write;
}

/** A whole `writes` array → `Write[]`. */
export function buildWrites(
  raw: unknown,
  nameOf: (path: string) => string,
): Array<Record<string, unknown>> {
  const list = asList(raw, "writes") as WriteEntry[];
  if (list.length === 0) throw new Error("`writes` must contain at least one entry");
  return list.map((entry) => buildWrite(entry, nameOf));
}
