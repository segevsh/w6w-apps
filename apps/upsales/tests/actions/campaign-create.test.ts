import { assertEquals, assertRejects } from "@std/assert";
import campaignCreate from "../../actions/campaign-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("campaign-create: POSTs /projects with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await campaignCreate.execute({
    "name": "Sales campaign April",
    "startDate": "2018-04-24",
    "endDate": "2018-05-24",
    "active": true,
    "notes": "Spring push",
    "userIds": "1",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/projects`);
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

Deno.test("campaign-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await campaignCreate.execute(
    {
      "name": "Sales campaign April",
      "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "Sales campaign April");
});

Deno.test("campaign-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await campaignCreate.execute(
    { "name": "Sales campaign April", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("campaign-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await campaignCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: required params are declared", () => {
  const required = (campaignCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["name"]);
});

Deno.test("campaign-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await campaignCreate.execute({
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

Deno.test("campaign-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await campaignCreate.execute({
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
