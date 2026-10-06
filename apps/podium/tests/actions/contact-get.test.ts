import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactGet from "../../actions/contact-get.ts";

Deno.test("contact-get: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactGet.execute({ "identifier": "ann@example.com" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/contacts/ann%40example.com");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-get: declares its params and kind", () => {
  assertEquals((contactGet.params ?? []).map((p) => p.key), ["identifier"]);
  assertEquals((contactGet.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "identifier",
  ]);
  assertEquals(contactGet.type, "read");
});
