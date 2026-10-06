import { assertEquals, assertRejects } from "@std/assert";
import campaignUpdate from "../../actions/campaign-update.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("campaign-update: PUTs /projects/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await campaignUpdate.execute({
    "id": 7,
    "name": "Sales campaign April",
    "startDate": "2018-04-24",
    "endDate": "2018-05-24",
    "active": true,
    "notes": "Spring push",
    "userIds": "1",
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/projects/7`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Sales campaign April",
    "startDate": "2018-04-24",
    "endDate": "2018-05-24",
    "active": 1,
    "notes": "Spring push",
    "users": [{ "id": 1 }],
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("campaign-update: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await campaignUpdate.execute(
    {
      "id": 7,
      "name": "Sales campaign April",
      "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "Sales campaign April");
});

Deno.test("campaign-update: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await campaignUpdate.execute(
    { "id": 7, "name": "Sales campaign April", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("campaign-update: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignUpdate.execute({ "id": 7, "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-update: an update with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignUpdate.execute({ id: 7 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-update: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await campaignUpdate.execute({
        "id": 7,
        "name": "Sales campaign April",
        "startDate": "2018-04-24",
        "endDate": "2018-05-24",
        "active": true,
        "notes": "Spring push",
        "userIds": "1",
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("campaign-update: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await campaignUpdate.execute({
        "id": 7,
        "name": "Sales campaign April",
        "startDate": "2018-04-24",
        "endDate": "2018-05-24",
        "active": true,
        "notes": "Spring push",
        "userIds": "1",
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
