import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/calendar-list.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("calendar-list: sends every filter as the documented query name and returns the next cursor", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      next: "https://us-west-2.recall.ai/api/v2/calendars/?cursor=CUR2",
      previous: null,
      results: [{
        id: "i1",
        oauth_refresh_token: "RT-SECRET",
        oauth_client_secret: "CS-SECRET",
        status: "connected",
      }],
    },
  }]);
  const out = await action.execute!({
    createdAtGte: "2026-01-01T00:00:00Z",
    email: "x1",
    platform: "google_calendar",
    status: "connected",
    cursor: "CUR1",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin + url.pathname, "https://us-west-2.recall.ai/api/v2/calendars/");
  assertEquals(
    url.search.slice(1).split("&").sort(),
    "created_at__gte=2026-01-01T00%3A00%3A00Z&email=x1&platform=google_calendar&status=connected&cursor=CUR1"
      .split("&").sort(),
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].body, null);
  assertEquals(out, { calendars: [{ id: "i1", status: "connected" }], nextCursor: "CUR2" });
});

Deno.test("calendar-list: the last page has no nextCursor and unset filters are not sent", async () => {
  const { ctx, calls } = mockCtx([{ body: { next: null, previous: null, results: [] } }]);
  const out = await action.execute!({}, ctx);
  assertEquals(out, { calendars: [] });
  const q = new URL(calls[0].url).searchParams;
  assertEquals([...q.keys()], []);
});

Deno.test("calendar-list: an authentication failure is reported by code", async () => {
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
