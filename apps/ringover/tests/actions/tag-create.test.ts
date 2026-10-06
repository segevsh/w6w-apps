import { assertEquals } from "@std/assert";
import action from "../../actions/tag-create.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("tag-create: POSTs name, color and description", async () => {
  const { ctx, calls } = mockCtx([{ body: "ok" }]);
  const out = await action.execute!(
    { name: "vip", color: "64B5F6", description: "Key accounts" },
    ctx,
  );
  assertEquals(calls[0].url, "https://public-api.ringover.com/v2/tags");
  assertEquals(JSON.parse(calls[0].body!), {
    name: "vip",
    color: "64B5F6",
    description: "Key accounts",
  });
  assertEquals(out, { created: true, name: "vip" });
  assertEquals(action.idempotent, false);
});
