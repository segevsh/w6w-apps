import { assertEquals } from "@std/assert";
import action from "../../actions/list-package-instances.ts";
import { API_ROOT, mockCtx, page, queryAllOf, queryOf, urlOf } from "../_helpers.ts";

const sample = page([{ id: "pi-1" }], { count: 1 });

Deno.test("list-package-instances: reads /consultant/packages/instances", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  const result = await action.execute({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/consultant/packages/instances`);
  assertEquals(result, sample);
});

Deno.test("list-package-instances: the documented filters are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({
    consultants: ["c-1"],
    packages: ["pkg-1", "pkg-2"],
    records: ["rec-1"],
    expired: false,
    status: ["active", "expired"],
  }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.expired, "false");
  const all = queryAllOf(calls[0].url);
  assertEquals(all.consultants, ["c-1"]);
  assertEquals(all.packages, ["pkg-1", "pkg-2"]);
  assertEquals(all.records, ["rec-1"]);
  assertEquals(all.status, ["active", "expired"]);
});

Deno.test("list-package-instances: unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: sample }]);
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), [
    "count",
    "hasMore",
    "items",
  ]);
});
