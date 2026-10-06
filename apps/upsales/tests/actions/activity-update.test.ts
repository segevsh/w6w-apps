import { assertEquals, assertRejects } from "@std/assert";
import activityUpdate from "../../actions/activity-update.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("activity-update: PUTs /activities/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await activityUpdate.execute({
    "id": 7,
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

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/activities/7`);
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

Deno.test("activity-update: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await activityUpdate.execute(
    {
      "id": 7,
      "description": "Book a meeting",
      "fields": { "extraKey": { "a": 1 }, "description": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["description"], "Book a meeting");
});

Deno.test("activity-update: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await activityUpdate.execute(
    { "id": 7, "description": "Book a meeting", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("activity-update: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await activityUpdate.execute({ "id": 7, "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("activity-update: an update with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await activityUpdate.execute({ id: 7 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("activity-update: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await activityUpdate.execute({
        "id": 7,
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

Deno.test("activity-update: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await activityUpdate.execute({
        "id": 7,
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
