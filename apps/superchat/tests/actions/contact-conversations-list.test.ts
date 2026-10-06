import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-conversations-list.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("contact-conversations-list: requests one page and surfaces the next cursor", async () => {
  const { ctx, calls } = mockCtx([{
    "body": {
      "url": "u",
      "results": [{ "id": "a" }],
      "pagination": {
        "next_cursor": "c_2",
        "previous_cursor": null,
        "next_url": null,
        "previous_url": null,
      },
    },
  }]);
  const result = await action.execute!(
    { "limit": 2, "after": "c_1", "contactId": "c_1" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "GET",
    "path": "/contacts/c_1/conversations",
    "query": { "limit": "2", "after": "c_1" },
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
    "url": "u",
    "results": [{ "id": "a" }],
    "pagination": {
      "next_cursor": "c_2",
      "previous_cursor": null,
      "next_url": null,
      "previous_url": null,
    },
    "nextCursor": "c_2",
  });
});

Deno.test("contact-conversations-list: rejects after + before together", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () =>
      await action.execute!({ "after": "a", "before": "b", "contactId": "c_1" } as never, ctx),
    Error,
  );
  assert(err.message.toLowerCase().includes("only one of"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
