import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import parserList from "../../actions/parser-list.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

test("parser-list: GET /v1/parsers wraps the bare array", async () => {
  const rows = [{ id: "mwekrupomwekrupo", label: "Invoices" }, { id: "b", label: "B" }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await parserList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/parsers");
  assertEquals(out, { items: rows, count: 2 });
});

test("parser-list: a non-array body yields an empty page", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  assertEquals(await parserList.execute({}, ctx), { items: [], count: 0 });
});

test("parser-list: HTTP errors throw with the vendor message", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { error: "api key not valid" } }]);
  const err = await errorOf(() => parserList.execute({}, ctx));
  assertEquals(err.message.includes("api key not valid"), true);
});
