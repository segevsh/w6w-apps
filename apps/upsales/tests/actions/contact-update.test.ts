import { assertEquals, assertRejects } from "@std/assert";
import contactUpdate from "../../actions/contact-update.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("contact-update: PUTs /contacts/{id} with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await contactUpdate.execute({
    "id": 7,
    "name": "Erlich Bachman",
    "email": "erlich@example.com",
    "phone": "08-860 804 04",
    "cellPhone": "0732231312",
    "title": "Designer",
    "active": false,
    "clientId": 2,
  }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/7`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "Erlich Bachman",
    "email": "erlich@example.com",
    "phone": "08-860 804 04",
    "cellPhone": "0732231312",
    "title": "Designer",
    "active": 0,
    "client": { "id": 2 },
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("contact-update: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await contactUpdate.execute(
    {
      "id": 7,
      "name": "Erlich Bachman",
      "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "Erlich Bachman");
});

Deno.test("contact-update: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await contactUpdate.execute(
    { "id": 7, "name": "Erlich Bachman", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("contact-update: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactUpdate.execute({ "id": 7, "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-update: an update with nothing to change is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contactUpdate.execute({ id: 7 }, ctx),
    Error,
    "Nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("contact-update: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await contactUpdate.execute({
        "id": 7,
        "name": "Erlich Bachman",
        "email": "erlich@example.com",
        "phone": "08-860 804 04",
        "cellPhone": "0732231312",
        "title": "Designer",
        "active": false,
        "clientId": 2,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("contact-update: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await contactUpdate.execute({
        "id": 7,
        "name": "Erlich Bachman",
        "email": "erlich@example.com",
        "phone": "08-860 804 04",
        "cellPhone": "0732231312",
        "title": "Designer",
        "active": false,
        "clientId": 2,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
