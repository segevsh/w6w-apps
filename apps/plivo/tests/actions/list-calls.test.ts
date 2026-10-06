import { assertEquals, assertRejects } from "@std/assert";
import { BASE, CONN, mockCtx } from "../_helpers.ts";
import action from "../../actions/list-calls.ts";

Deno.test("list-calls: sends only the filters that were set, under the documented names", async () => {
  const body = {
    api_id: "a",
    meta: { limit: 5, offset: 0, total_count: 0, next: null },
    objects: [],
  };
  const { ctx, calls } = mockCtx([{ body }], CONN);
  const out = await action.execute!({
    fromNumber: "1",
    toNumber: "2",
    direction: "inbound",
    endedAfter: "2026-10-01 00:00:00",
    endedBefore: "2026-10-02 00:00:00",
    hangupCauseCode: 4010,
    limit: 20,
    offset: 0,
  }, ctx);
  assertEquals(calls[0].method, "GET");
  const u = new URL(calls[0].url);
  assertEquals(u.origin + u.pathname, BASE + "Call/");
  assertEquals(Object.fromEntries(u.searchParams), {
    from_number: "1",
    to_number: "2",
    call_direction: "inbound",
    end_time__gte: "2026-10-01 00:00:00",
    end_time__lte: "2026-10-02 00:00:00",
    hangup_cause_code: "4010",
    limit: "20",
    offset: "0",
  });
  assertEquals(out, body);
});

Deno.test("list-calls: no input means no query string", async () => {
  const { ctx, calls } = mockCtx([{ body: { objects: [] } }], CONN);
  await action.execute!({}, ctx);
  assertEquals(calls[0].url, BASE + "Call/");
});

Deno.test("list-calls: a 401 plain-text body is thrown with its text", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Could not verify your access level" }], CONN);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "Could not verify your access level",
  );
});
