import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/get-usage.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("get-usage: sends the date range", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      "from": "2025-01-01",
      "to": "2025-01-31",
      "total": { "finder": 250, "verifier": 180 },
      "items": [],
    },
  }]);
  const out = await action.execute!({ "from": "2025-01-01", "to": "2025-01-31" } as never, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/credits/report/summary");
  assertEquals(calls[0].method, "GET");
  assertEquals(Object.fromEntries(url.searchParams), { "from": "2025-01-01", "to": "2025-01-31" });
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, {
    "from": "2025-01-01",
    "to": "2025-01-31",
    "total": { "finder": 250, "verifier": 180 },
    "items": [],
  });
});

Deno.test("get-usage: surfaces a 422 bad date", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      "message": "The from field must be a valid date.",
      "errors": { "from": ["The from field must be a valid date."] },
    },
  }]);
  const err = await assertRejects(async () => await action.execute!({ "from": "x" } as never, ctx));
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 422"), msg);
  assert(msg.includes("valid date"), msg);
});
