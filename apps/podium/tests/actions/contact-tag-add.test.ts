import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactTagAdd from "../../actions/contact-tag-add.ts";

Deno.test("contact-tag-add: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactTagAdd.execute(
    { "identifier": "ann@example.com", "uid": "uid-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contacts/ann%40example.com/tags/uid-1");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-tag-add: declares its params and kind", () => {
  assertEquals((contactTagAdd.params ?? []).map((p) => p.key), ["identifier", "uid"]);
  assertEquals((contactTagAdd.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "identifier",
    "uid",
  ]);
  assertEquals(contactTagAdd.type, "perform");
  assertEquals(contactTagAdd.idempotent, true);
});
