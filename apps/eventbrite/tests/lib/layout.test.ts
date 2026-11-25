import { test } from "node:test";
import { assert, assertEquals } from "../_assert.ts";
import app from "../../index.ts";

// The editor puts ADJACENT params that share a `row` id side by side (Studio `renderFieldRows`).
// A row id split by another field silently renders one field per line. A row of one (Page alone,
// on lists that refuse page_size) renders like a plain field.
test("params sharing a row id are adjacent", () => {
  const forms = [
    ...(app.actions ?? []).map((a) => ({ name: `action ${a.key}`, params: a.params ?? [] })),
    ...(app.triggers ?? []).map((t) => ({ name: `trigger ${t.key}`, params: t.params ?? [] })),
  ];
  let pairs = 0;
  for (const { name, params } of forms) {
    const seen = new Map<string, number[]>();
    params.forEach((p, i) => {
      if (p.row) seen.set(p.row, [...(seen.get(p.row) ?? []), i]);
    });
    for (const [row, at] of seen) {
      if (at.length >= 2) pairs++;
      assertEquals(at, at.map((_, j) => at[0] + j), `${name}: row "${row}" is not contiguous`);
    }
  }
  assert(pairs > 10, `expected the paired rows, saw ${pairs}`);
});

test("Page size and Page share a row wherever both are offered", () => {
  for (const a of app.actions ?? []) {
    const size = a.params?.find((p) => p.key === "pageSize");
    const page = a.params?.find((p) => p.key === "page");
    if (size && page) {
      assertEquals([size.row, page.row], ["paging", "paging"], a.key);
    }
  }
});

test("Continuation token joins the paging row on every list that offers it", () => {
  let n = 0;
  for (const a of app.actions ?? []) {
    const params = a.params ?? [];
    const at = params.findIndex((p) => p.key === "continuation");
    if (at < 0) continue;
    n++;
    assertEquals(params[at].row, "paging", a.key);
    const prev = params[at - 1];
    if (prev?.key === "page" || prev?.key === "pageSize") assertEquals(prev.row, "paging", a.key);
  }
  assert(n >= 18, `expected every list with a continuation token, saw ${n}`);
});
