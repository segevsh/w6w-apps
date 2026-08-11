import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-get: calls GET /leads/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "l1", status: "open", conversions: [] } }]);
  const out = await leadGet.execute({ leadId: "l1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/leads/l1");
  assertEquals(out.status, "open");
});

Deno.test("lead-get: declares conversions, which is empty until the lead is converted", () => {
  const keys = (leadGet.output as Array<{ key: string }>).map((o) => o.key);
  assertEquals(keys.includes("conversions"), true);
});
