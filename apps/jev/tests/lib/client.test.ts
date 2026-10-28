import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { JevClient } from "../../lib/client.ts";

Deno.test("client: sends JSON body with content-type and throws on non-2xx", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: 1 } }, { status: 500, body: "boom" }]);
  const c = new JevClient(ctx);
  assertEquals(await c.request("/x", { method: "POST", body: { a: 1 } }), { ok: 1 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  await assertRejects(() => c.request("/y"), Error, "Jev 500");
});
