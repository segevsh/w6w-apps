import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import funnelCreate from "../../actions/funnel-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

test("funnel-create: POSTs {name} to /api/funnels", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: 1, name: "Launch", isActive: false },
  }]);
  const out = await funnelCreate.execute({ name: "Launch" }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/funnels");
  assertEquals(JSON.parse(calls[0].body!), { name: "Launch" });
  assertEquals(out, { id: 1, name: "Launch", isActive: false });
});
