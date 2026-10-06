import { assertEquals, assertRejects } from "@std/assert";
import ticketCreate from "../../actions/ticket-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("ticket-create: POSTs /tickets with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await ticketCreate.execute({
    "title": "Cannot log in",
    "statusId": 1,
    "typeId": 1,
    "clientId": 12,
    "contactId": 340,
    "userId": 5,
    "priority": 0,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/tickets`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "title": "Cannot log in",
    "status": { "id": 1 },
    "type": { "id": 1 },
    "client": { "id": 12 },
    "contact": { "id": 340 },
    "user": { "id": 5 },
    "priority": 0,
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("ticket-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await ticketCreate.execute(
    {
      "title": "Cannot log in",
      "fields": { "extraKey": { "a": 1 }, "title": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["title"], "Cannot log in");
});

Deno.test("ticket-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await ticketCreate.execute(
    { "title": "Cannot log in", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("ticket-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await ticketCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("ticket-create: required params are declared", () => {
  const required = (ticketCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["title"]);
});

Deno.test("ticket-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await ticketCreate.execute({
        "title": "Cannot log in",
        "statusId": 1,
        "typeId": 1,
        "clientId": 12,
        "contactId": 340,
        "userId": 5,
        "priority": 0,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("ticket-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await ticketCreate.execute({
        "title": "Cannot log in",
        "statusId": 1,
        "typeId": 1,
        "clientId": 12,
        "contactId": 340,
        "userId": 5,
        "priority": 0,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
