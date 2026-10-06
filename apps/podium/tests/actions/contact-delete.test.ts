import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactDelete from "../../actions/contact-delete.ts";

Deno.test("contact-delete: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactDelete.execute({ "identifier": "ann@example.com" } as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "DELETE");
  assertEquals(url.origin + url.pathname, API + "/contacts/ann%40example.com");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-delete: declares its params and kind", () => {
  assertEquals((contactDelete.params ?? []).map((p) => p.key), ["identifier"]);
  assertEquals((contactDelete.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "identifier",
  ]);
  assertEquals(contactDelete.type, "perform");
  assertEquals(contactDelete.idempotent, true);
});
