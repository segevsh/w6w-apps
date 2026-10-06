import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactAttributeList from "../../actions/contact-attribute-list.ts";

Deno.test("contact-attribute-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactAttributeList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/contact_attributes");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("contact-attribute-list: declares its params and kind", () => {
  assertEquals((contactAttributeList.params ?? []).map((p) => p.key), []);
  assertEquals((contactAttributeList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(contactAttributeList.type, "read");
});
