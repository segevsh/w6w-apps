import { assertEquals, assertRejects } from "@std/assert";
import viewer from "../../actions/get-viewer.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-viewer: reads usage and computes remaining credits", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      type: "api-key",
      id: "k1",
      name: "prod",
      usage: { used: 40, quota: 100 },
      organization: { id: "o1", urn: "urn:o1", name: "Acme" },
    },
  }]);
  const out = await run(viewer, {}, ctx);
  assertEquals(calls[0].url, "https://api.brandfetch.io/v2/viewer");
  assertEquals(out.keyName, "prod");
  assertEquals(out.remaining, 60);
  assertEquals((out.organization as { name: string }).name, "Acme");
});

Deno.test("get-viewer: over-quota never reports negative remaining; 403 throws", async () => {
  const over = mockCtx([{ body: { type: "api-key", usage: { used: 120, quota: 100 } } }]);
  assertEquals((await run(viewer, {}, over.ctx)).remaining, 0);
  const bad = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  await assertRejects(() => run(viewer, {}, bad.ctx), Error, "Forbidden");
});
