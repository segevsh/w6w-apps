import { assertEquals, assertRejects } from "@std/assert";
import activityCreate from "../../actions/activity-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("activity-create: POSTs /activities with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await activityCreate.execute({
    "description": "Book a meeting",
    "date": "2022-04-23",
    "closeDate": "2022-04-24",
    "notes": "No answer",
    "clientId": 2,
    "contactIds": "3,4",
    "userIds": "1",
    "activityTypeId": 11,
    "priority": 3,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/activities`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "description": "Book a meeting",
    "date": "2022-04-23",
    "closeDate": "2022-04-24",
    "notes": "No answer",
    "client": { "id": 2 },
    "contacts": [{ "id": 3 }, { "id": 4 }],
    "users": [{ "id": 1 }],
    "activityType": { "id": 11 },
    "priority": 3,
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("activity-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await activityCreate.execute(
    {
      "description": "Book a meeting",
      "fields": { "extraKey": { "a": 1 }, "description": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["description"], "Book a meeting");
});

Deno.test("activity-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await activityCreate.execute(
    { "description": "Book a meeting", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("activity-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await activityCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("activity-create: required params are declared", () => {
  const required = (activityCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["description"]);
});

Deno.test("activity-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await activityCreate.execute({
        "description": "Book a meeting",
        "date": "2022-04-23",
        "closeDate": "2022-04-24",
        "notes": "No answer",
        "clientId": 2,
        "contactIds": "3,4",
        "userIds": "1",
        "activityTypeId": 11,
        "priority": 3,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("activity-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await activityCreate.execute({
        "description": "Book a meeting",
        "date": "2022-04-23",
        "closeDate": "2022-04-24",
        "notes": "No answer",
        "clientId": 2,
        "contactIds": "3,4",
        "userIds": "1",
        "activityTypeId": 11,
        "priority": 3,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
