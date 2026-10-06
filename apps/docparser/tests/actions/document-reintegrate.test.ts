import { assert, assertEquals } from "@std/assert";
import action from "../../actions/document-reintegrate.ts";
import { errorOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("document-reintegrate: POSTs document_ids[] to /v1/document/reintegrate/<parser>", async () => {
  const resp = { total_reintegrate: 2, msg: "" };
  const { ctx, calls } = mockCtx([{ body: resp }]);
  const out = await action.execute({ parserId: "p1", documentIds: "d1, d2\nd3" }, ctx);
  assertEquals(out, resp);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/document/reintegrate/p1");
  assertEquals(new URLSearchParams(calls[0].body!).getAll("document_ids[]"), ["d1", "d2", "d3"]);
});

Deno.test("document-reintegrate: accepts an array and rejects an empty list without a request", async () => {
  const first = mockCtx([{ body: {} }]);
  await action.execute({ parserId: "p1", documentIds: ["x"] }, first.ctx);
  assertEquals(new URLSearchParams(first.calls[0].body!).getAll("document_ids[]"), ["x"]);

  const { ctx, calls } = mockCtx([]);
  const err = await errorOf(() => action.execute({ parserId: "p1", documentIds: " , " }, ctx));
  assert(err.message.includes("at least one document ID"));
  assertEquals(calls.length, 0);
});
