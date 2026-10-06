import { assertEquals, assertRejects } from "@std/assert";
import productCreate from "../../actions/product-create.ts";
import { API_ROOT, envelope, mockCtx, queryOf } from "../_helpers.ts";

Deno.test("product-create: POSTs /products with the mapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  const out = await productCreate.execute({
    "name": "SaaS product",
    "listPrice": 20000,
    "active": true,
    "categoryId": 11,
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/products`);
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), {
    "name": "SaaS product",
    "listPrice": 20000,
    "active": 1,
    "category": { "id": 11 },
  });
  assertEquals(out, { data: { id: 7 } });
});

Deno.test("product-create: the free-form fields object is merged and typed params win", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await productCreate.execute(
    {
      "name": "SaaS product",
      "fields": { "extraKey": { "a": 1 }, "name": "SHOULD-LOSE" },
    } as never,
    ctx,
  );
  const sent = JSON.parse(calls[0].body!);
  assertEquals(sent.extraKey, { a: 1 });
  assertEquals(sent["name"], "SaaS product");
});

Deno.test("product-create: fields may be a JSON string", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 7 }) }]);
  await productCreate.execute({ "name": "SaaS product", "fields": '{"extraKey":1}' } as never, ctx);
  assertEquals(JSON.parse(calls[0].body!).extraKey, 1);
});

Deno.test("product-create: invalid fields JSON is refused before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await productCreate.execute({ "fields": "{nope" } as never, ctx),
    Error,
    "not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("product-create: required params are declared", () => {
  const required = (productCreate.params ?? []).filter((p) => p.required).map((p) => p.key);
  assertEquals(required, ["name"]);
});

Deno.test("product-create: a rejected key surfaces Upsales' plain-text Unauthorized", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    headers: { "content-type": "text/plain" },
    body: "Unauthorized",
  }]);
  await assertRejects(
    async () =>
      await productCreate.execute({
        "name": "SaaS product",
        "listPrice": 20000,
        "active": true,
        "categoryId": 11,
      }, ctx),
    Error,
    "401",
  );
});

Deno.test("product-create: a JSON error envelope surfaces the vendor key", async () => {
  const { ctx } = mockCtx([{
    status: 429,
    body: { error: { key: "ThrottleLimit", code: 429, errorCode: 4, msg: "Too many requests" } },
  }]);
  await assertRejects(
    async () =>
      await productCreate.execute({
        "name": "SaaS product",
        "listPrice": 20000,
        "active": true,
        "categoryId": 11,
      }, ctx),
    Error,
    "ThrottleLimit",
  );
});
