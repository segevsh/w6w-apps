import { assertEquals, assertRejects } from "@std/assert";
import { mockCliqCtx } from "../_helpers.ts";
import action from "../../actions/reminder-create.ts";

Deno.test("reminder-create: self reminder", async () => {
  const { ctx, calls } = mockCliqCtx([{
    "status": 201,
    "body": { "id": "r1", "content": "Review" },
  }]);
  const out = await action.execute({ "content": "Review", "time": 1506571200000 } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/reminders");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "content": "Review", "time": 1506571200000 });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), {
    "reminder": { "id": "r1", "content": "Review" },
  });
});

Deno.test("reminder-create: for users by email", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "id": "r2" } }]);
  const out = await action.execute({ "content": "Go", "emailIds": "a@b.c" } as never, ctx);
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/reminders");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), { "content": "Go", "email_ids": ["a@b.c"] });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "reminder": { "id": "r2" } });
});

Deno.test("reminder-create: for a chat", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "id": "r3" } }]);
  const out = await action.execute(
    { "content": "Sync", "time": 5, "chatId": "1277744356562927809" } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/reminders");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "content": "Sync",
    "time": 5,
    "chat_ids": ["1277744356562927809"],
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "reminder": { "id": "r3" } });
});

Deno.test("reminder-create: on a message", async () => {
  const { ctx, calls } = mockCliqCtx([{ "status": 200, "body": { "id": "r4" } }]);
  const out = await action.execute(
    { "messageId": "1536662288710", "chatId": "123", "time": 7 } as never,
    ctx,
  );
  assertEquals(calls.length, 1);
  const url = new URL(calls[0].url);
  assertEquals(url.host, "cliq.zoho.com");
  assertEquals(url.pathname, "/api/v2/reminders");
  assertEquals(calls[0].method, "POST");
  assertEquals(Object.fromEntries(url.searchParams), {});
  assertEquals(JSON.parse(calls[0].body!), {
    "message_id": "1536662288710",
    "chat_id": "123",
    "time": 7,
  });
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(JSON.parse(JSON.stringify(out ?? null)), { "reminder": { "id": "r4" } });
});

Deno.test("reminder-create: a message reminder needs a chat id", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "messageId": "1", "time": 1 } as never, ctx)),
    Error,
    "chatId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("reminder-create: a chat reminder needs a time", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "content": "x", "chatId": "1" } as never, ctx)),
    Error,
    "time",
  );
  assertEquals(calls.length, 0);
});

Deno.test("reminder-create: a self reminder needs content", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(() => Promise.resolve(action.execute({} as never, ctx)), Error, "content");
  assertEquals(calls.length, 0);
});

Deno.test("reminder-create: caps assignees at 4", async () => {
  const { ctx, calls } = mockCliqCtx([]);
  await assertRejects(
    () => Promise.resolve(action.execute({ "content": "x", "userIds": "1,2,3,4,5" } as never, ctx)),
    Error,
    "4 assignees",
  );
  assertEquals(calls.length, 0);
});

Deno.test("reminder-create: idempotent is declared as false", () => {
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, false);
});
