import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/set-structured-content.ts";

Deno.test("set-structured-content: POSTs modules to versioned path", async () => {
  const { ctx, calls } = mockCtx([{ body: { page_version_number: "3" } }]);
  const modules = [{ type: "text", data: { body: { type: "text", text: "<p>Hi</p>" } } }];
  await action.execute!(
    { eventId: "5", version: "2", modules, publish: true, purpose: "listing" },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/events/5/structured_content/2/");
  assertEquals(JSON.parse(calls[0].body!), { modules, publish: true, purpose: "listing" });
});

Deno.test("set-structured-content: accessType maps to access_type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ eventId: "5", version: "1", modules: [], accessType: "private" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { modules: [], access_type: "private" });
});
