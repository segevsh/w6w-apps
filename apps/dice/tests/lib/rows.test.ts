import { test } from "node:test";
import assert from "node:assert/strict";
import { rowsResult } from "../../lib/rows.ts";
import { connection, record } from "../fixtures.ts";

test("normalizes connection without changing money cents or nullable values", () => {
  assert.deepEqual(rowsResult(connection), {
    rows: [record],
    rowCount: 1,
    totalCount: 12,
    page: { hasMore: true, nextCursor: "opaque-next" },
    pageInfo: { hasNextPage: true, endCursor: "opaque-next" },
  });
});
test("last page preserves vendor endCursor without inventing a continuation", () => {
  const result = rowsResult({
    edges: [],
    totalCount: null,
    pageInfo: { hasNextPage: false, endCursor: "last" },
  });
  assert.deepEqual(result.page, { hasMore: false, nextCursor: null });
  assert.deepEqual(result.pageInfo, { hasNextPage: false, endCursor: "last" });
  assert.equal(result.totalCount, null);
  assert.deepEqual(result.rows, []);
});
for (
  const value of [
    null,
    {},
    { ...connection, edges: null },
    { ...connection, edges: [null] },
    { ...connection, edges: [{ node: null }] },
    { ...connection, totalCount: -1 },
    { ...connection, pageInfo: { hasNextPage: true, endCursor: null } },
    { ...connection, pageInfo: { hasNextPage: "yes", endCursor: "x" } },
  ]
) {
  test(`incomplete/malformed page refuses silent row loss ${JSON.stringify(value)}`, () => {
    assert.throws(() => rowsResult(value));
  });
}
