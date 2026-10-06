import { assertEquals } from "@std/assert";
import { API, mockCtx } from "../_helpers.ts";
import contactTagCreate from "../../actions/contact-tag-create.ts";

Deno.test("contact-tag-create: sends every documented field in its documented place", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { uid: "r1" }, metadata: { nextCursor: "c2" } },
  }]);
  const result = await contactTagCreate.execute(
    { "label": "label-1", "description": "description-1" } as never,
    ctx,
  );
  const call = calls[0];
  const url = new URL(call.url);
  assertEquals(call.method, "POST");
  assertEquals(url.origin + url.pathname, API + "/contact_tags");
  assertEquals([...url.searchParams.keys()].length, 0);
  assertEquals(JSON.parse(call.body ?? "null"), {
    "label": "label-1",
    "description": "description-1",
  });
  assertEquals(call.headers["content-type"], "application/json");
  assertEquals(result, { uid: "r1" });
});

Deno.test("contact-tag-create: declares its params and kind", () => {
  assertEquals((contactTagCreate.params ?? []).map((p) => p.key), ["label", "description"]);
  assertEquals((contactTagCreate.params ?? []).filter((p) => p.required).map((p) => p.key), [
    "label",
    "description",
  ]);
  assertEquals(contactTagCreate.type, "perform");
  assertEquals(contactTagCreate.idempotent, false);
});
