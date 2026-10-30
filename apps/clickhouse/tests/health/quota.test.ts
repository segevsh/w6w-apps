import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import quota from "../../health/quota.ts";

test("quota: is declared unavailable, with no live probe", () => {
  assertEquals(typeof quota.check, "undefined");
  assert(quota.unavailable, "quota declares no reason");
  assertEquals(quota.kind, "quota");
});

/** The summary is a cost, not headroom. */
test("quota: says why the one header that exists is not headroom", () => {
  const reason = quota.unavailable!.reason;
  assert(/X-ClickHouse-Summary/.test(reason), reason);
  assert(/cost of the query just run rather than headroom/.test(reason), reason);
});

/** The real constraints are none of them rates. */
test("quota: names memory, concurrency and parts as the actual constraints", () => {
  const reason = quota.unavailable!.reason;
  assert(/MEMORY_LIMIT_EXCEEDED/.test(reason), reason);
  assert(/max_concurrent_queries/.test(reason), reason);
  assert(/TOO_MANY_PARTS/.test(reason), reason);
});

/** And each has an action that answers it honestly. */
test("quota: points at the actions that do answer the question", () => {
  const reason = quota.unavailable!.reason;
  assert(/`query-run` returns rows scanned/.test(reason), reason);
  assert(/`table-list` reports the per-table part count/.test(reason), reason);
  assertEquals(quota.severity, "informational");
});
