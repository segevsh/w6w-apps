import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/template-analytics-get.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("template-analytics-get: sends the period and one template_ids param per id", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "results": [] } }]);
  const result = await action.execute!(
    {
      "templateIds": ["t_1", "t_2"],
      "from": "2026-10-01T00:00:00Z",
      "to": "2026-10-06T00:00:00Z",
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "GET",
    "path": "/analytics/templates",
    "query": {
      "template_ids": ["t_1", "t_2"],
      "from": "2026-10-01T00:00:00Z",
      "to": "2026-10-06T00:00:00Z",
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
  assertEquals(result, { "results": [] });
});

Deno.test("template-analytics-get: an empty list throws", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () => await action.execute!({ "templateIds": [], "from": "a", "to": "b" } as never, ctx),
    Error,
  );
  assert(err.message.toLowerCase().includes("non-empty"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
