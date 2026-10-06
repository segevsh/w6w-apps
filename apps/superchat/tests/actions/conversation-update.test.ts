import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/conversation-update.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("conversation-update: PATCHes only the fields that were set", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "cv_1", "status": "snoozed" } }]);
  const result = await action.execute!(
    {
      "conversationId": "cv_1",
      "status": "snoozed",
      "snoozedUntil": "2026-10-07T08:00:00Z",
      "labels": ["l_1"],
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "PATCH",
    "path": "/conversations/cv_1",
    "body": { "status": "snoozed", "snoozed_until": "2026-10-07T08:00:00Z", "labels": ["l_1"] },
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
  assertEquals(result, { "id": "cv_1", "status": "snoozed" });
});

Deno.test("conversation-update: maps inbox and assignees to their snake_case fields", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "cv_1" } }]);
  const result = await action.execute!(
    { "conversationId": "cv_1", "inboxId": "i_1", "assignedUsers": ["u_1"] } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "PATCH",
    "path": "/conversations/cv_1",
    "body": { "inbox_id": "i_1", "assigned_users": ["u_1"] },
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
  assertEquals(result, { "id": "cv_1" });
});
