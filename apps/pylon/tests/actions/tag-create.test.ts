import { assertEquals } from "@std/assert";
import action from "../../actions/tag-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-create: POSTs value, object_type and color", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: "g1", value: "vip" } } }]);
  const out = await action.execute!(
    { value: "vip", objectType: "issue", hexColor: "#ff0000" },
    ctx,
  );
  assertEquals(calls[0].url, "https://api.usepylon.com/tags");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    value: "vip",
    object_type: "issue",
    hex_color: "#ff0000",
  });
  assertEquals(out, { id: "g1", value: "vip" });
});

Deno.test("tag-create: value and object type are required; a duplicate reports the existing id", async () => {
  assertEquals(action.params!.filter((p) => p.required).map((p) => p.key), ["value", "objectType"]);
  const { ctx } = mockCtx([{
    status: 400,
    body: { errors: ["exists"], code: "duplicate_object", exists_id: "g0" },
  }]);
  let message = "";
  try {
    await action.execute!({ value: "vip", objectType: "issue" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("(duplicate_object) [existing id g0]"), true);
});
