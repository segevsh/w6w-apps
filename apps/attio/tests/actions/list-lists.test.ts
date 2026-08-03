import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import listLists from "../../actions/list-lists.ts";

Deno.test("list-lists: GETs /v2/lists with no parameters at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ api_slug: "sales" }] } }]);
  const out = await run<{ records: unknown[] }>(listLists, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.attio.com/v2/lists");
  assertEquals(out.records, [{ api_slug: "sales" }]);
  assertEquals(listLists.params, []);
});

Deno.test("list-lists: says a short result is usually a scope problem", () => {
  assert(/scope/i.test(listLists.description!));
});
