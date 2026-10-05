import { assert, assertEquals, assertRejects } from "@std/assert";
import riskList from "../../actions/risk-list.ts";
import { errorBody, mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

const BASE = { "riskRegisterId": 2 };

Deno.test("risk-list: GET /risk-registers/2/risks sends only the page defaults and flattens the envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: page([{ id: 1 }, { id: 2 }], "next-abc", 2) }]);
  const out = await riskList.execute({ ...BASE, size: 25, includeTotalCount: true }, ctx) as {
    items: unknown[];
    nextCursor: string | null;
    totalCount: number | null;
  };

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/public/v2/risk-registers/2/risks");
  assertEquals(new URL(calls[0].url).origin, "https://public-api.drata.com");
  assertEquals(queryOf(calls[0].url).get("size"), "25");
  assertEquals(queryOf(calls[0].url).get("includeTotalCount"), "true");
  assertEquals(queryOf(calls[0].url).has("cursor"), false);
  assertEquals(out.items.length, 2);
  assertEquals(out.nextCursor, "next-abc");
  assertEquals(out.totalCount, 2);
});

Deno.test("risk-list: filters and expand go out under their wire names; a cursor is forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: page([]) }]);
  const out = await riskList.execute({
    ...BASE,
    ...{ "status": "ACTIVE", "minScore": 10 },
    cursor: "c1",
  }, ctx) as {
    items: unknown[];
    nextCursor: string | null;
  };

  const q = queryOf(calls[0].url);
  assertEquals(q.get("cursor"), "c1");
  const wire = [["status", "ACTIVE"], ["minScore", "10"]] as Array<[string, string]>;
  for (const key of new Set(wire.map(([k]) => k))) {
    assertEquals(q.getAll(key), wire.filter(([k]) => k === key).map(([, v]) => v), key);
  }
  assertEquals(out.items, []);
  assertEquals(out.nextCursor, null);
});

Deno.test("risk-list: a 403 names the permission problem and keeps Drata's message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: errorBody(403, "Forbidden resource", 5) }]);
  const err = await assertRejects(() => Promise.resolve(riskList.execute({ ...BASE }, ctx)), Error);
  assert(err.message.includes("HTTP 403"), err.message);
  assert(err.message.includes("Forbidden resource"), err.message);
  assert(err.message.includes("permission"), err.message);
});
