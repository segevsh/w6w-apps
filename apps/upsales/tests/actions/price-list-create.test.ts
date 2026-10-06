import { assertEquals, assertRejects } from "@std/assert";
import priceListCreate from "../../actions/price-list-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("price-list-create: POSTs /priceLists with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await priceListCreate.execute({
    "name": "New price list",
    "code": "ABC123",
    "active": true,
    "isDefault": false,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/priceLists`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "New price list",
    "code": "ABC123",
    "active": true,
    "isDefault": false,
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("price-list-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await priceListCreate.execute(
    {
      "name": "New price list",
      "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "New price list");
});

Deno.test("price-list-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await priceListCreate.execute(
    { "name": "New price list", "fields": '{"extraKey":1}' } as never,
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("price-list-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await priceListCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("price-list-create: required params are declared", () => {
  const required = (priceListCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["name"]);
});

Deno.test("price-list-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await priceListCreate.execute({
        "name": "New price list",
        "code": "ABC123",
        "active": true,
        "isDefault": false,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("price-list-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await priceListCreate.execute({
        "name": "New price list",
        "code": "ABC123",
        "active": true,
        "isDefault": false,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
