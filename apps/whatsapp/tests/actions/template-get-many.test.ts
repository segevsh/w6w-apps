import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-get-many.ts";

Deno.test("template-get-many: GETs /{wabaId}/message_templates with the filter and limit", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: [{ name: "hello_world", status: "APPROVED" }] },
  }]);
  const out = await action.execute({ name: "hello_world", limit: 5 }, ctx);
  assertEquals(out, { data: [{ name: "hello_world", status: "APPROVED" }] });
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v23.0/9876543210/message_templates");
  assertEquals(url.searchParams.get("name"), "hello_world");
  assertEquals(url.searchParams.get("limit"), "5");
});

Deno.test("template-get-many: omits the name filter when left blank", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute({ name: "", limit: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("name"), false);
});

Deno.test("template-get-many: is a read action with no required params", () => {
  assertEquals(action.type, "read");
  assertEquals(action.params?.every((p) => !p.required), true);
});
