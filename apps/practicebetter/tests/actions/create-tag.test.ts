import { assertEquals } from "@std/assert";
import action from "../../actions/create-tag.ts";
import { API_ROOT, bodyOf, mockCtx, urlOf } from "../_helpers.ts";

Deno.test("create-tag: POSTs to /tags and returns the created id and name", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tag-9", name: "VIP" } }]);
  const result = await action.execute({ name: "VIP" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(urlOf(calls[0]), `${API_ROOT}/tags`);
  assertEquals(bodyOf(calls[0]), { name: "VIP" });
  assertEquals(result, { id: "tag-9", name: "VIP" });
});

Deno.test("create-tag: the optional note is sent when supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "tag-9", name: "VIP" } }]);
  await action.execute({ name: "VIP", notes: "priority scheduling" }, ctx);
  assertEquals(bodyOf(calls[0]), { name: "VIP", notes: "priority scheduling" });
});

Deno.test("create-tag: not idempotent — it is the Tag_Save operation", () => {
  assertEquals(action.idempotent, false);
  assertEquals(action.params!.find((p) => p.key === "name")!.required, true);
  assertEquals((action.output as Array<{ key: string }>).map((o) => o.key), ["id", "name"]);
});
