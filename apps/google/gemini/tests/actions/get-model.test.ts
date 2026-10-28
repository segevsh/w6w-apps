import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-model.ts";

Deno.test("get-model: GETs /models/{model} for a bare model id", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "models/gemini-3.5-flash" } }]);
  await action.execute!({ model: "gemini-3.5-flash" }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models/gemini-3.5-flash");
});

Deno.test("get-model: leaves an already-qualified models/… name alone", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ model: "models/gemini-3.5-flash" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1beta/models/gemini-3.5-flash");
});
