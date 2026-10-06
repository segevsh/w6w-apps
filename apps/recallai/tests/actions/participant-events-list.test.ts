import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/participant-events-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("participant-events-list: sends every filter as the documented query name and returns the next cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      next: "https://us-west-2.recall.ai/api/v1/participant_events/?cursor=CUR2",
      previous: null,
      results: [{ id: "i1" }],
    },
  }]);
  const out = await action.execute!({
    recordingId: "x1",
    createdAfter: "2026-01-01T00:00:00Z",
    createdBefore: "2026-01-01T00:00:00Z",
    statusCode: "done",
    cursor: "CUR1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://us-west-2.recall.ai/api/v1/participant_events/");
  assertEquals(
    url.search.slice(1).split("&").sort(),
    "recording_id=x1&created_at_after=2026-01-01T00%3A00%3A00Z&created_at_before=2026-01-01T00%3A00%3A00Z&status_code=done&cursor=CUR1"
      .split("&").sort(),
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(out, { participantEvents: [{ id: "i1" }], nextCursor: "CUR2" });
});

Deno.test("participant-events-list: the last page has no nextCursor and unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { next: null, previous: null, results: [] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(out, { participantEvents: [] });
  const q = new URL(calls[0].url).searchParams;
  assertEquals([...q.keys()], []);
});

Deno.test("participant-events-list: an authentication failure is reported by code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "authentication_failed", detail: "Invalid API token." },
  }]);
  await assertRejects(
    async () => await action.execute!({}, ctx),
    Error,
    "(authentication_failed)",
  );
});
