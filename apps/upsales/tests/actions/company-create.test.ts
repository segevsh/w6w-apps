import { assertEquals, assertRejects } from "@std/assert";
import companyCreate from "../../actions/company-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("company-create: POSTs /accounts with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await companyCreate.execute({
    "name": "Salesboard",
    "phone": "+46(0)8123456",
    "fax": "+46(0)8123457",
    "webpage": "http://salesboard.com",
    "notes": "VIP",
    "userIds": "1,2",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/accounts`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Salesboard",
    "phone": "+46(0)8123456",
    "fax": "+46(0)8123457",
    "webpage": "http://salesboard.com",
    "notes": "VIP",
    "users": [{ "id": 1 }, { "id": 2 }],
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("company-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await companyCreate.execute(
    { "name": "Salesboard", "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" } } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "Salesboard");
});

Deno.test("company-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await companyCreate.execute({ "name": "Salesboard", "fields": '{"extraKey":1}' } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("company-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await companyCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("company-create: required params are declared", () => {
  const required = (companyCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["name"]);
});

Deno.test("company-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await companyCreate.execute({
        "name": "Salesboard",
        "phone": "+46(0)8123456",
        "fax": "+46(0)8123457",
        "webpage": "http://salesboard.com",
        "notes": "VIP",
        "userIds": "1,2",
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("company-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await companyCreate.execute({
        "name": "Salesboard",
        "phone": "+46(0)8123456",
        "fax": "+46(0)8123457",
        "webpage": "http://salesboard.com",
        "notes": "VIP",
        "userIds": "1,2",
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
