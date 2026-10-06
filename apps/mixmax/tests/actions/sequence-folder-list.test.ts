import { assertEquals } from "@std/assert";
import action from "../../actions/sequence-folder-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("sequence-folder-list: GET /sequencefolders", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [{ _id: "f1" }] } }]);
  const out = await action.execute!({} as never, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.mixmax.com/v1/sequencefolders");
  assertEquals(calls[0].body, null);
  assertEquals(out, { results: [{ _id: "f1" }] });
});
