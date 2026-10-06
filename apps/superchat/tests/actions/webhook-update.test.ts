import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/webhook-update.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("webhook-update: PUTs only what was set and redacts the secret", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "w_1", "secret": "s3cret" } }]);
  const result = await action.execute!(
    { "subscriptionId": "w_1", "eventTypes": ["contact_created"] } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "PUT",
    "path": "/webhooks/w_1",
    "body": { "events": [{ "type": "contact_created" }] },
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
  assertEquals(result, { "id": "w_1", "secret": "[redacted]" });
});

Deno.test("webhook-update: can change just the target URL", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "w_1", "secret": null } }]);
  const result = await action.execute!(
    { "subscriptionId": "w_1", "targetUrl": "https://y.test/h" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{ "method": "PUT", "path": "/webhooks/w_1", "body": { "target_url": "https://y.test/h" } }];
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
  assertEquals(result, { "id": "w_1", "secret": null });
});
