import { assertEquals } from "@std/assert";
import productUpdate from "../../actions/product-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("product-update: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await productUpdate.execute(
    { "productId": 7, "name": "x-name", "description": "x-description" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/products");
  assertEquals(JSON.parse(calls[0].body!), {
    "productId": 7,
    "name": "x-name",
    "description": "x-description",
  });
  assertEquals(out, REPLY);
});

Deno.test("product-update: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await productUpdate.execute({ "productId": 7 } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "productId": 7 });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("product-update: declares a perform action's idempotency", () => {
  assertEquals(productUpdate.type, "perform");
  assertEquals(productUpdate.idempotent, true);
  assertEquals(productUpdate.params!.filter((p) => p.required).map((p) => p.key), ["productId"]);
});
