import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/message-send.ts";

const BASE = "https://api.superchat.com/v1.0";

Deno.test("message-send: sends a text message", async () => {
  const { ctx, calls } = mockCtx([{
    "body": { "id": "m_1", "conversation_id": "cv_1", "status": "processed" },
  }]);
  const result = await action.execute!(
    { "channelId": "mc_1", "to": "+491701234567", "contentType": "text", "body": "Hi" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/messages",
    "body": {
      "to": [{ "identifier": "+491701234567" }],
      "from": { "channel_id": "mc_1", "name": null },
      "content": { "type": "text", "body": "Hi" },
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
  assertEquals(result, { "id": "m_1", "conversation_id": "cv_1", "status": "processed" });
});

Deno.test("message-send: sends a WhatsApp template with variables, a header file and a reply target", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "m_2" } }]);
  const result = await action.execute!(
    {
      "channelId": "mc_1",
      "to": "ct_1",
      "senderName": "Shop",
      "contentType": "whats_app_template",
      "templateId": "t_1",
      "variables": [{ "position": 1, "value": "Ada" }],
      "fileId": "f_1",
      "inReplyTo": "m_0",
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/messages",
    "body": {
      "to": [{ "identifier": "ct_1" }],
      "from": { "channel_id": "mc_1", "name": "Shop" },
      "content": {
        "type": "whats_app_template",
        "template_id": "t_1",
        "variables": [{ "position": 1, "value": "Ada" }],
        "file": { "id": "f_1" },
      },
      "in_reply_to": "m_0",
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
  assertEquals(result, { "id": "m_2" });
});

Deno.test("message-send: sends an email with attachments, omitting unset fields", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "m_3" } }]);
  const result = await action.execute!(
    {
      "channelId": "mc_2",
      "to": "a@b.co",
      "contentType": "email",
      "subject": "S",
      "html": "<p>x</p>",
      "fileIds": ["f_9"],
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/messages",
    "body": {
      "to": [{ "identifier": "a@b.co" }],
      "from": { "channel_id": "mc_2", "name": null },
      "content": {
        "type": "email",
        "subject": "S",
        "html": "<p>x</p>",
        "files": [{ "id": "f_9" }],
      },
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
  assertEquals(result, { "id": "m_3" });
});

Deno.test("message-send: sends media and generic-template content", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "m_4" } }]);
  const result = await action.execute!(
    { "channelId": "mc_1", "to": "ct_1", "contentType": "media", "fileId": "f_2" } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/messages",
    "body": {
      "to": [{ "identifier": "ct_1" }],
      "from": { "channel_id": "mc_1", "name": null },
      "content": { "type": "media", "file_id": "f_2" },
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
  assertEquals(result, { "id": "m_4" });
});

Deno.test("message-send: passes custom content through untouched", async () => {
  const { ctx, calls } = mockCtx([{ "body": { "id": "m_5" } }]);
  const result = await action.execute!(
    {
      "channelId": "mc_1",
      "to": "ct_1",
      "contentType": "custom",
      "customContent": {
        "type": "whats_app_quick_reply",
        "body": "?",
        "replies": [{ "value": "Yes" }],
      },
    } as never,
    ctx,
  );
  const expected: Array<
    { method: string; path: string; query?: Record<string, string | string[]>; body?: unknown }
  > = [{
    "method": "POST",
    "path": "/messages",
    "body": {
      "to": [{ "identifier": "ct_1" }],
      "from": { "channel_id": "mc_1", "name": null },
      "content": { "type": "whats_app_quick_reply", "body": "?", "replies": [{ "value": "Yes" }] },
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
  assertEquals(result, { "id": "m_5" });
});

Deno.test("message-send: refuses custom without content, and unknown types", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () =>
      await action.execute!(
        { "channelId": "mc_1", "to": "ct_1", "contentType": "custom" } as never,
        ctx,
      ),
    Error,
  );
  assert(err.message.toLowerCase().includes("custom content json"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});

Deno.test("message-send: unknown content type throws", async () => {
  const { ctx, calls } = mockCtx();
  const err = await assertRejects(
    async () =>
      await action.execute!(
        { "channelId": "mc_1", "to": "ct_1", "contentType": "nope" } as never,
        ctx,
      ),
    Error,
  );
  assert(err.message.toLowerCase().includes("unknown content type"), err.message);
  assertEquals(calls.length, 0, "must fail before any request");
});
