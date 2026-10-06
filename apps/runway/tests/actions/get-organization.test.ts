import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-organization.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-organization: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      "tier": { "maxMonthlyCreditSpend": 1000, "models": {} },
      "creditBalance": 420,
      "usage": { "models": {} },
    },
  }]);
  const out = await run(action, {}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/organization");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(calls[0].body, null);
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "creditBalance": 420,
    "maxMonthlyCreditSpend": 1000,
    "tier": { "maxMonthlyCreditSpend": 1000, "models": {} },
    "usage": { "models": {} },
  });
});

Deno.test("get-organization: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(() => run(action, {}, bad.ctx), Error, "No API key was provided.");
});
