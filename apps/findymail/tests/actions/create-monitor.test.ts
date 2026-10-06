import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/create-monitor.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("create-monitor: POSTs the monitor with lists split and filters parsed", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { "id": 1, "name": "Hiring", "signal_type": "keyword_mention" },
  }]);
  const out = await action.execute!(
    {
      "name": "Hiring",
      "signal_type": "keyword_mention",
      "keywords": "hiring, fundraise",
      "icp_filters": '{"countries":["US"]}',
      "is_shared": false,
    } as never,
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://app.findymail.com");
  assertEquals(url.pathname, "/api/signals/monitors");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "Hiring",
    "signal_type": "keyword_mention",
    "keywords": ["hiring", "fundraise"],
    "is_shared": false,
    "icp_filters": { "countries": ["US"] },
  });
  assertEquals(calls[0].headers["accept"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
  assertEquals(out, { "id": 1, "name": "Hiring", "signal_type": "keyword_mention" });
});

Deno.test("create-monitor: surfaces a 422 validation error", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: {
      "message": "The given data was invalid.",
      "errors": { "job_offer_title_keywords": ["required"] },
    },
  }]);
  const err = await assertRejects(async () =>
    await action.execute!({ "name": "x", "signal_type": "company_hiring" } as never, ctx)
  );
  const msg = (err as Error).message;
  assert(msg.includes("HTTP 422"), msg);
  assert(msg.includes("job_offer_title_keywords: required"), msg);
});
