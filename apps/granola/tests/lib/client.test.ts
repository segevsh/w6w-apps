import { assert, assertEquals, assertRejects } from "@std/assert";
import { API_BASE, compact, encodeId, GranolaClient } from "../../lib/client.ts";
import { toCustodians, toList } from "../../lib/params.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("client: base is public-api.granola.ai/v1, not the old api.granola.ai", async () => {
  assertEquals(API_BASE, "https://public-api.granola.ai");
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new GranolaClient(ctx).request("/folders", { query: { a: undefined, b: "", c: 1 } });
  assertEquals(calls[0].url, "https://public-api.granola.ai/v1/folders?c=1");
});

Deno.test("client: 204 yields undefined", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await new GranolaClient(ctx).request("/x", { method: "DELETE" }), undefined);
});

Deno.test("client: error message prefers code + message and handles a non-JSON body", async () => {
  const a = mockCtx([{ status: 500, body: "<html>oops</html>", statusText: "Server Error" }]);
  const err = await assertRejects(async () => await new GranolaClient(a.ctx).request("/x"));
  assert((err as Error).message.includes("Granola 500"));
  assert((err as Error).message.includes("Server Error"));
});

Deno.test("client: compact drops undefined but keeps false, null and empty arrays", () => {
  assertEquals(compact({ a: undefined, b: false, c: null, d: [] }), { b: false, c: null, d: [] });
});

Deno.test("client: encodeId trims and encodes", () => {
  assertEquals(encodeId(" a/b "), "a%2Fb");
});

Deno.test("params: toList accepts arrays and comma/newline strings", () => {
  assertEquals(toList(undefined), undefined);
  assertEquals(toList(" a, b\nc  "), ["a", "b", "c"]);
  assertEquals(toList([" x ", ""]), ["x"]);
  assertEquals(toCustodians("a@x.com", "usr_1"), [{ email: "a@x.com" }, { id: "usr_1" }]);
});
