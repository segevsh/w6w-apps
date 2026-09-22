import { assertEquals, assertThrows } from "@std/assert";
import {
  buildFilter,
  buildLimit,
  buildOrderBy,
  buildStructuredQuery,
  buildWhere,
  buildWrite,
  buildWrites,
} from "../../lib/query.ts";

const nameOf = (path: string) => `projects/p1/databases/(default)/documents/${path}`;

// ----------------------------------------------------------------- filters --

Deno.test("buildFilter: an operator maps onto the wire enum, value included", () => {
  assertEquals(buildFilter({ field: "age", op: ">=", value: 18 }), {
    fieldFilter: {
      field: { fieldPath: "age" },
      op: "GREATER_THAN_OR_EQUAL",
      value: { integerValue: "18" },
    },
  });
  assertEquals(buildFilter({ field: "name", op: "==", value: "Ada" }), {
    fieldFilter: { field: { fieldPath: "name" }, op: "EQUAL", value: { stringValue: "Ada" } },
  });
  // The enum name itself is accepted too.
  assertEquals(
    (buildFilter({ field: "x", op: "ARRAY_CONTAINS", value: 1 }) as never as {
      fieldFilter: { op: string };
    }).fieldFilter.op,
    "ARRAY_CONTAINS",
  );
});

Deno.test("buildFilter: `is-null` is a UnaryFilter, which takes no value", () => {
  assertEquals(buildFilter({ field: "deletedAt", op: "is-null" }), {
    unaryFilter: { op: "IS_NULL", field: { fieldPath: "deletedAt" } },
  });
});

Deno.test("buildFilter: a bad operator, a missing value and a missing field all throw", () => {
  assertThrows(() => buildFilter({ field: "a", op: "LIKE", value: 1 }), Error, "filter operator");
  assertThrows(() => buildFilter({ field: "a", op: ">=" }), Error, "value");
  assertThrows(() => buildFilter({ op: "==", value: 1 }), Error, "field");
});

/** One filter is bare; two or more are wrapped in an AND composite. */
Deno.test("buildWhere: none, one and many", () => {
  assertEquals(buildWhere("[]"), undefined);
  assertEquals(buildWhere(undefined), undefined);
  const one = buildWhere('[{"field":"a","op":"==","value":1}]') as {
    fieldFilter?: unknown;
    compositeFilter?: unknown;
  };
  assertEquals(Boolean(one.fieldFilter), true);
  assertEquals(one.compositeFilter, undefined);
  const many = buildWhere(
    '[{"field":"a","op":"==","value":1},{"field":"b","op":"<","value":2}]',
  ) as {
    compositeFilter?: { op: string; filters: unknown[] };
  };
  assertEquals(many.compositeFilter?.op, "AND");
  assertEquals(many.compositeFilter?.filters.length, 2);
});

// ----------------------------------------------------------------- ordering --

Deno.test("buildOrderBy: direction defaults to ascending, spelled out on the wire", () => {
  assertEquals(buildOrderBy('[{"field":"age"}]'), [
    { field: { fieldPath: "age" }, direction: "ASCENDING" },
  ]);
  assertEquals(buildOrderBy('[{"field":"age","direction":"descending"}]'), [
    { field: { fieldPath: "age" }, direction: "DESCENDING" },
  ]);
  assertEquals(buildOrderBy("[]"), undefined);
  assertThrows(() => buildOrderBy('[{"field":"a","direction":"sideways"}]'), Error, "direction");
  assertThrows(() => buildOrderBy('[{"direction":"asc"}]'), Error, "field");
});

Deno.test("buildLimit: zero is a real limit only when supplied; blank is unset", () => {
  assertEquals(buildLimit(0), 0);
  assertEquals(buildLimit(5), 5);
  assertEquals(buildLimit(undefined), undefined);
  assertEquals(buildLimit(""), undefined);
  assertThrows(() => buildLimit(-1), Error, "non-negative");
  assertThrows(() => buildLimit(1.5), Error, "non-negative");
});

Deno.test("buildStructuredQuery: from + where + orderBy + limit, assembled", () => {
  const q = buildStructuredQuery({
    collectionId: "cities",
    allDescendants: true,
    filters: '[{"field":"population","op":">","value":1000000}]',
    orderBy: '[{"field":"population","direction":"desc"}]',
    limit: 10,
  });
  assertEquals(q.from, [{ collectionId: "cities", allDescendants: true }]);
  assertEquals(Boolean(q.where), true);
  assertEquals(q.orderBy, [{ field: { fieldPath: "population" }, direction: "DESCENDING" }]);
  assertEquals(q.limit, 10);
});

Deno.test("buildStructuredQuery: only `from` when nothing else is given", () => {
  assertEquals(buildStructuredQuery({ collectionId: "users" }), {
    from: [{ collectionId: "users" }],
  });
});

// ------------------------------------------------------------------ writes --

Deno.test("buildWrite: `set` replaces the whole document", () => {
  assertEquals(
    buildWrite({ op: "set", path: "users/alice", data: { name: "Ada" } }, nameOf),
    {
      update: {
        name: "projects/p1/databases/(default)/documents/users/alice",
        fields: { name: { stringValue: "Ada" } },
      },
    },
  );
});

Deno.test("buildWrite: `update` carries the mask that makes it partial", () => {
  assertEquals(
    buildWrite({ op: "update", path: "users/alice", mask: "age", data: { age: 37 } }, nameOf),
    {
      update: {
        name: "projects/p1/databases/(default)/documents/users/alice",
        fields: { age: { integerValue: "37" } },
      },
      updateMask: { fieldPaths: ["age"] },
    },
  );
});

Deno.test("buildWrite: `delete` is a bare name, with a precondition when asked", () => {
  assertEquals(buildWrite({ op: "delete", path: "users/bob" }, nameOf), {
    delete: "projects/p1/databases/(default)/documents/users/bob",
  });
  assertEquals(buildWrite({ op: "delete", path: "users/bob", exists: true }, nameOf), {
    delete: "projects/p1/databases/(default)/documents/users/bob",
    currentDocument: { exists: true },
  });
});

Deno.test("buildWrite: the op vocabulary is enforced", () => {
  assertThrows(
    () => buildWrite({ op: "upsert", path: "a/b", data: {} }, nameOf),
    Error,
    "write op",
  );
  assertThrows(() => buildWrite({ op: "set", data: {} }, nameOf), Error, "`path`");
  assertThrows(() => buildWrite({ op: "set", path: "a/b" }, nameOf), Error, "`data`");
  // `set` must not look like a partial write.
  assertThrows(
    () => buildWrite({ op: "set", path: "a/b", data: {}, mask: "x" }, nameOf),
    Error,
    "must not carry `mask`",
  );
  // And `update` must say which fields.
  assertThrows(
    () => buildWrite({ op: "update", path: "a/b", data: {} }, nameOf),
    Error,
    "needs `mask`",
  );
});

Deno.test("buildWrite: an update precondition reaches currentDocument", () => {
  const write = buildWrite(
    { op: "update", path: "a/b", mask: "x", data: { x: 1 }, updateTime: "2026-09-22T00:00:00Z" },
    nameOf,
  );
  assertEquals(write.currentDocument, { updateTime: "2026-09-22T00:00:00Z" });
});

Deno.test("buildWrites: a whole array, and an empty one is refused", () => {
  const writes = buildWrites(
    '[{"op":"delete","path":"a/b"},{"op":"set","path":"a/c","data":{}}]',
    nameOf,
  );
  assertEquals(writes.length, 2);
  assertEquals(Boolean(writes[0].delete), true);
  assertThrows(() => buildWrites("[]", nameOf), Error, "at least one");
  assertThrows(() => buildWrites("{}", nameOf), Error, "JSON array");
});
