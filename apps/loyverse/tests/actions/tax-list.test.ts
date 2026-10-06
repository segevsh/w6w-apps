import { assertEquals } from "@std/assert";
import action from "../../actions/tax-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("tax-list: GET /taxes maps params to the vendor's query names", async () => {
  const { ctx, calls } = mockCtx([{ body: { taxes: [{ id: "a" }], cursor: "c2" } }]);
  const out = await action.execute({ taxIds: "t1" }, ctx) as { taxes: unknown[]; cursor?: string };
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v1.0/taxes");
  assertEquals(queryOf(calls[0].url), { tax_ids: "t1" });
  assertEquals(out.taxes.length, 1);
  assertEquals(out.cursor, "c2");
});

Deno.test("tax-list: no params sends no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { taxes: [] } }]);
  const out = await action.execute({}, ctx) as { cursor?: string };
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(out.cursor, undefined);
});
