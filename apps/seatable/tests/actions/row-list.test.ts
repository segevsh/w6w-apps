import { assertEquals } from "@std/assert";
import rowList from "../../actions/row-list.ts";
import { BASE_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("row-list: GETs /rows/ with a small default limit and column names", async () => {
  const { ctx, calls } = mockCtx([{ body: { rows: [{ _id: "r1", Name: "A" }] } }]);
  const out = await rowList.execute({ tableName: "Table1" }, ctx) as { rows: unknown[] };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), `${BASE_PATH}/rows/`);
  assertEquals(queryOf(calls[0].url), {
    table_name: "Table1",
    limit: "100",
    convert_keys: "true",
  });
  assertEquals(out.rows.length, 1);
});

Deno.test("row-list: view, start, limit and convertKeys=false are forwarded", async () => {
  const { ctx, calls } = mockCtx([{ body: { rows: [] } }]);
  await rowList.execute(
    { tableName: "My Table", viewName: "Open", start: 200, limit: 50, convertKeys: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    table_name: "My Table",
    view_name: "Open",
    start: "200",
    limit: "50",
    convert_keys: "false",
  });
});

Deno.test("row-list: start=0 is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: { rows: [] } }]);
  await rowList.execute({ tableName: "T", start: 0 }, ctx);
  assertEquals(queryOf(calls[0].url).start, "0");
});

Deno.test("row-list: a bare 429 is reported as a rate limit", async () => {
  const { ctx } = mockCtx([{ status: 429 }]);
  try {
    await rowList.execute({ tableName: "T" }, ctx);
    throw new Error("expected rejection");
  } catch (err) {
    assertEquals(String(err).includes("rate limited (429)"), true);
  }
});
