import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import listCustomFields from "../../actions/list-custom-fields.ts";

Deno.test("list-custom-fields: GETs the page custom-fields endpoint", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success", data: [] } }]);
  await listCustomFields.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.manychat.com/fb/page/getCustomFields");
});

Deno.test("list-custom-fields: returns definitions — no `value` key on the wire", async () => {
  const { ctx } = mockCtx([
    { body: { status: "success", data: [{ id: 1, name: "plan", type: "text", description: "" }] } },
  ]);
  const out = await listCustomFields.execute!({}, ctx) as { data: Array<Record<string, unknown>> };
  assertEquals(Object.keys(out.data[0]).sort(), ["description", "id", "name", "type"]);
});

Deno.test("list-custom-fields: is scoped to the custom-field resource, not bot-field", () => {
  assertEquals(listCustomFields.resource, "custom-field");
});
