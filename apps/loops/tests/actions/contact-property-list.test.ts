import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-property-list.ts";

Deno.test("contact-property-list: defaults to all properties", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ key: "plan", type: "string" }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/properties");
  assertEquals(new URL(calls[0].url).searchParams.get("list"), "all");
  assertEquals(result, [{ key: "plan", type: "string" }]);
});

Deno.test("contact-property-list: can narrow to the custom ones", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }]);
  await action.execute!({ list: "custom" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("list"), "custom");
});
