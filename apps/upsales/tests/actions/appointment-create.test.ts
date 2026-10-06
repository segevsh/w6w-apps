import { assertEquals, assertRejects } from "@std/assert";
import appointmentCreate from "../../actions/appointment-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("appointment-create: POSTs /appointments with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await appointmentCreate.execute({
    "description": "Requirements analysis",
    "date": "2018-04-24T09:00:42.903Z",
    "endDate": "2018-04-24T10:00:42.903Z",
    "notes": "Bring slides",
    "clientId": 2,
    "userIds": "1",
    "contactIds": "5",
    "activityTypeId": 7,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/appointments`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "description": "Requirements analysis",
    "date": "2018-04-24T09:00:42.903Z",
    "endDate": "2018-04-24T10:00:42.903Z",
    "notes": "Bring slides",
    "client": 2,
    "users": [{ "id": 1 }],
    "contacts": [{ "id": 5 }],
    "activityType": { "id": 7 },
    "isAppointment": true,
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("appointment-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await appointmentCreate.execute(
    {
      "description": "Requirements analysis",
      "fields": { "extraKey": { "a": 1 }, "description": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["description"], "Requirements analysis");
});

Deno.test("appointment-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await appointmentCreate.execute(
    { "description": "Requirements analysis", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("appointment-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await appointmentCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("appointment-create: required params are declared", () => {
  const required = (appointmentCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["description", "date", "endDate"]);
});

Deno.test("appointment-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await appointmentCreate.execute({
        "description": "Requirements analysis",
        "date": "2018-04-24T09:00:42.903Z",
        "endDate": "2018-04-24T10:00:42.903Z",
        "notes": "Bring slides",
        "clientId": 2,
        "userIds": "1",
        "contactIds": "5",
        "activityTypeId": 7,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("appointment-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await appointmentCreate.execute({
        "description": "Requirements analysis",
        "date": "2018-04-24T09:00:42.903Z",
        "endDate": "2018-04-24T10:00:42.903Z",
        "notes": "Bring slides",
        "clientId": 2,
        "userIds": "1",
        "contactIds": "5",
        "activityTypeId": 7,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
