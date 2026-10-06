import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/note-list.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("note-list: GETs the notes with paging", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "results": [], "pagination": { "next_cursor": null } },
  }]);
  const result = await action.execute!(
    { "conversationId": "cv_1", "limit": 10, "before": "n_9" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "GET",
    "path": "/conversations/cv_1/notes",
    "query": { "limit": "10", "before": "n_9" },
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
    "results": [],
    "pagination": { "next_cursor": null },
    "nextCursor": null,
  });
});

Deno.test("note-list: rejects after + before together", async () => {
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
