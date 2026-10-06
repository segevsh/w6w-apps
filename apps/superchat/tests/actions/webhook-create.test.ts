import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-create.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("webhook-create: POSTs target and events, and returns the secret unredacted", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "w_1", "secret": "s3cret" } }]);
  const result = await action.execute!(
    {
      "targetUrl": "https://x.test/hook",
      "eventTypes": ["message_inbound", "note_created"],
      "filters": [{ "type": "inbox", "ids": ["i_1"] }],
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/webhooks",
    "body": {
      "target_url": "https://x.test/hook",
      "events": [{ "type": "message_inbound", "filters": [{ "type": "inbox", "ids": ["i_1"] }] }, {
        "type": "note_created",
        "filters": [{ "type": "inbox", "ids": ["i_1"] }],
      }],
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
  assertEquals(result, { "id": "w_1", "secret": "s3cret" });
});

Deno.test("webhook-create: omits events when none are selected", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "w_2" } }]);
  const result = await action.execute!({ "targetUrl": "https://x.test/hook" } as never, ctx);
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{ "method": "POST", "path": "/webhooks", "body": { "target_url": "https://x.test/hook" } }];
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
  assertEquals(result, { "id": "w_2" });
});
