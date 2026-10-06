import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactTagRemove from "../../actions/contact-tag-remove.ts";

Deno.test("contact-tag-remove: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactTagRemove.execute(
    { "identifier": "ann@example.com", "uid": "uid-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "DELETE");
  assertEquals(url.origin + url.pathname, API + "/contacts/ann%40example.com/tags/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-tag-remove: declares its params and kind", () => {
  assertEquals((contactTagRemove.params ?? []).map((p) => p.key), ["identifier", "uid"]);
  assertEquals((contactTagRemove.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "identifier",
    "uid",
  ]);
  assertEquals(contactTagRemove.type, "perform");
  assertEquals(contactTagRemove.idempotent, true);
});
