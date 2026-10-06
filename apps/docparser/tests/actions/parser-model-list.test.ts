import { assert, assertEquals } from "@std/assert";
import parserModelList from "../../actions/parser-model-list.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("parser-model-list: GET /v1/parser/models/<id>", async () => {
  const rows = [{ id: "1", label: "Layout #1" }];
  const { ctx, calls } = mockCtx([{ body: rows }]);
  const out = await parserModelList.execute({ parserId: " abc/def " }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/parser/models/abc%2Fdef");
  assertEquals(out, { items: rows, count: 1 });
});

Deno.test("parser-model-list: requires parserId without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  const err = await errorOf(() => parserModelList.execute({ parserId: " " }, ctx));
  assert(err.message.includes("parserId is required"));
  assertEquals(calls.length, 0);
});
