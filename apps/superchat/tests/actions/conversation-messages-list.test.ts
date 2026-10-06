import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-messages-list.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("conversation-messages-list: forwards direction and the created window", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "results": [{ "id": "m_1" }], "pagination": { "next_cursor": "m_1" } },
  }]);
  const result = await action.execute!(
    {
      "conversationId": "cv_1",
      "direction": "INBOUND",
      "createdAfter": "2026-10-01T00:00:00Z",
      "createdBefore": "2026-10-06T00:00:00Z",
      "limit": 3,
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "GET",
    "path": "/conversations/cv_1/messages",
    "query": {
      "direction": "INBOUND",
      "created_after": "2026-10-01T00:00:00Z",
      "created_before": "2026-10-06T00:00:00Z",
      "limit": "3",
    },
  }];
  assertEquals(calls.length, expected.length, "number of requests");
  expected.forEach((want, i) => {
    const url = new URL(calls[i].url);
    assertEquals(url.origin + url.pathname, BASE + want.path);
    assertEquals(calls[i].method, want.method);
    const got: Record<string, string | string[]> = {};
    for (const key of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(key);
      got[key] = all.length > 1 || Array.isArray(want.query?.[key]) ? all : all[0];
    }
    assertEquals(got, want.query ?? {});
    assertEquals(calls[i].body === null ? undefined : JSON.parse(calls[i].body!), want.body);
    assertEquals(calls[i].headers["x-api-key"], undefined, "credentials belong to sign only");
  });
  assertEquals(result, {
    "results": [{ "id": "m_1" }],
    "pagination": { "next_cursor": "m_1" },
    "nextCursor": "m_1",
  });
});

Deno.test("conversation-messages-list: rejects after + before together", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () =>
      await action.execute!(
        { "conversationId": "cv_1", "after": "a", "before": "b" } as never,
        ctx,
      ),
    Error,
  );
  assert(err.message.toLowerCase().includes("only one of"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
