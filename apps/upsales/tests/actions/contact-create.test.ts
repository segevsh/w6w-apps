import { assertEquals, assertRejects } from "@std/assert";
import contactCreate from "../../actions/contact-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("contact-create: POSTs /contacts with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await contactCreate.execute({
    "firstName": "Erlich",
    "lastName": "Bachman",
    "email": "erlich@example.com",
    "phone": "08-860 804 04",
    "cellPhone": "0732231312",
    "title": "Designer",
    "active": true,
    "clientId": 2,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts`);
  assertEquals(queryOf(calls[0].url), { "usingFirstnameLastname": "true" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "firstName": "Erlich",
    "lastName": "Bachman",
    "email": "erlich@example.com",
    "phone": "08-860 804 04",
    "cellPhone": "0732231312",
    "title": "Designer",
    "active": 1,
    "client": { "id": 2 },
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("contact-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await contactCreate.execute(
    {
      "firstName": "Erlich",
      "fields": { "extraKey": { "a": 1 }, "firstName": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["firstName"], "Erlich");
});

Deno.test("contact-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await contactCreate.execute({ "firstName": "Erlich", "fields": '{"extraKey":1}' } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("contact-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-create: required params are declared", () => {
  const required = (contactCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["firstName", "clientId"]);
});

Deno.test("contact-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await contactCreate.execute({
        "firstName": "Erlich",
        "lastName": "Bachman",
        "email": "erlich@example.com",
        "phone": "08-860 804 04",
        "cellPhone": "0732231312",
        "title": "Designer",
        "active": true,
        "clientId": 2,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("contact-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await contactCreate.execute({
        "firstName": "Erlich",
        "lastName": "Bachman",
        "email": "erlich@example.com",
        "phone": "08-860 804 04",
        "cellPhone": "0732231312",
        "title": "Designer",
        "active": true,
        "clientId": 2,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
