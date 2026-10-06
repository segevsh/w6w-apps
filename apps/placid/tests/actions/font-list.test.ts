import { assertEquals } from "@std/assert";
import fontList from "../../actions/font-list.ts";
import { mockCtx, queryOf } from "../_helpers.ts";

const FONT = { uuid: "f1", title: "H", filename: "h.ttf", created_at: "2026-05-06T11:24:00+00:00" };

Deno.test("font-list: include_legacy=1 and cursor in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [FONT], links: {}, meta: { per_page: 20 } } }]);
  const out = await fontList.execute({ include_legacy: true, cursor: "C" }, ctx) as {
    data: unknown[];
  };
  assertEquals(out.data.length, 1);
  assertEquals(queryOf(calls[0].url), { include_legacy: "1", cursor: "C" });
  const plain = mockCtx([{ body: { data: [] } }]);
  await fontList.execute({}, plain.ctx);
  assertEquals(queryOf(plain.calls[0].url), {});
});
