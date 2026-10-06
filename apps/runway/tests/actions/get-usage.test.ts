import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-usage.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("get-usage: sends the documented request and maps the answer", async () => {
  const { ctx, calls } = mockCtx([{
    body: { "results": [{ "date": "2026-09-01", "usedCredits": [] }], "models": ["gen4.5"] },
  }]);
  const out = await run(action, { "startDate": "2026-09-01", "beforeDate": "2026-10-01" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.dev.runwayml.com/v1/organization/usage");
  assertEquals(calls[0].headers["x-runway-version"], "2024-11-06");
  assertEquals(JSON.parse(calls[0].body!), {
    "startDate": "2026-09-01",
    "beforeDate": "2026-10-01",
  });
  assertEquals(calls.length, 1);
  assertEquals(JSON.parse(JSON.stringify(out)), {
    "results": [{ "date": "2026-09-01", "usedCredits": [] }],
    "models": ["gen4.5"],
  });
});

Deno.test("get-usage: a 401 surfaces Runway's error text", async () => {
  const bad = mockCtx([{
    status: 401,
    body: { error: "No API key was provided." },
  }]);
  await assertRejects(
    () => run(action, { "startDate": "2026-09-01", "beforeDate": "2026-10-01" }, bad.ctx),
    Error,
    "No API key was provided.",
  );
});
