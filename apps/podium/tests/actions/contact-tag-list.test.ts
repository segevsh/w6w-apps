import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactTagList from "../../actions/contact-tag-list.ts";

Deno.test("contact-tag-list: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ uid: "r1" }, { uid: "r2" }], metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactTagList.execute({} as never, ctx);
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "GET");
  assertEquals(url.origin + url.pathname, API + "/contact_tags");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(call.body, null);
  assertEquals(result, { items: [{ uid: "r1" }, { uid: "r2" }], nextCursor: "c2" });
});

Deno.test("contact-tag-list: declares its params and kind", () => {
  assertEquals((contactTagList.params ?? []).map((p) => p.key), []);
  assertEquals((contactTagList.params ?? []).filter((p) => p.required).map((p) => p.key), []);
  assertEquals(contactTagList.type, "read");
});
