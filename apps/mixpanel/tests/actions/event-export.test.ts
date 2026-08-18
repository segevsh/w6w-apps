import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/event-export.ts";

const conn = { display: { projectId: "123", region: "us" } };

/** Its own host family, its own rate budget, and JSONL rather than JSON. */
Deno.test("event-export: reads JSONL from the export host", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: '{"event":"a","properties":{"time":1}}\n{"event":"b","properties":{"time":2}}',
    headers: { "content-type": "text/plain" },
  }], conn);
  const out = await action.execute!({ fromDate: "2026-08-01", toDate: "2026-08-02" }, ctx) as {
    events: unknown[];
    count: number;
  };
  assertEquals(out.count, 2);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "data.mixpanel.com");
  assertEquals(url.pathname, "/api/2.0/export");
});

Deno.test("event-export: an event filter is encoded as a JSON array", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }], conn);
  await action.execute!({
    fromDate: "2026-08-01",
    toDate: "2026-08-02",
    events: "Signed Up,Purchased",
  }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.get("event"),
    '["Signed Up","Purchased"]',
  );
});

Deno.test("event-export: a limit above Mixpanel's ceiling is refused", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({ fromDate: "2026-08-01", toDate: "2026-08-02", limit: 100001 }, ctx),
    Error,
    "100,000",
  );
  assertEquals(calls.length, 0);
});

/** UTC here, project-local in the query API. */
Deno.test("event-export: the description warns the timezone differs", () => {
  assert(/UTC/.test(action.description!), action.description);
});
