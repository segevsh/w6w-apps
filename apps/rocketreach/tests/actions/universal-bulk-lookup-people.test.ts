import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/universal-bulk-lookup-people.ts";
import { mockCtx, run } from "../_helpers.ts";

Deno.test("universal-bulk-lookup-people: POSTs the queries to /universal/person/bulk_lookup and returns the request id", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "RR-Request-ID": "req-1" },
    body: { status: "accepted" },
  }]);
  const out = await run(action, {
    queries: '[{"linkedin_url":"https://www.linkedin.com/in/benioff"},{"id":5}]',
    profile_list: "Q4",
    webhook_id: 3,
  }, ctx);
  assertEquals(calls[0].url, "https://api.rocketreach.co/api/v2/universal/person/bulk_lookup");
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    queries: [{ linkedin_url: "https://www.linkedin.com/in/benioff" }, { id: 5 }],
    profile_list: "Q4",
    webhook_id: 3,
  });
  assertEquals([out.accepted, out.queries, out.requestId], [true, 2, "req-1"]);
});

Deno.test("universal-bulk-lookup-people: an array object is accepted, an empty body is tolerated", async () => {
  const { ctx } = mockCtx([{ status: 200 }]);
  const out = await run(action, { queries: [{ id: 1 }] }, ctx);
  assertEquals([out.accepted, out.requestId, out.response], [true, null, null]);
});

Deno.test("universal-bulk-lookup-people: rejects 0 or 101 queries, bad JSON and non-objects before any request", async () => {
  const none = mockCtx();
  await assertRejects(() => run(action, { queries: [] }, none.ctx), Error, "1 to 100");
  await assertRejects(
    () => run(action, { queries: Array(101).fill({ id: 1 }) }, none.ctx),
    Error,
    "1 to 100",
  );
  await assertRejects(() => run(action, { queries: "{" }, none.ctx), Error, "valid JSON");
  await assertRejects(() => run(action, { queries: ["x"] }, none.ctx), Error, "JSON object");
  assertEquals(none.calls.length, 0);
});

Deno.test("universal-bulk-lookup-people: a 429 throws with Retry-After", async () => {
  const bad = mockCtx([{
    status: 429,
    headers: { "retry-after": "60" },
    body: { detail: "Bulk limit" },
  }]);
  await assertRejects(
    () => run(action, { queries: [{ id: 1 }] }, bad.ctx),
    Error,
    "retry after 60s",
  );
});
