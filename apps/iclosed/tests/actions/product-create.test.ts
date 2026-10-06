import { assertEquals } from "@std/assert";
import productCreate from "../../actions/product-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REPLY = { data: { ok: true }, message: "done" };

Deno.test("product-create: sends every input as body", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await productCreate.execute(
    { "name": "x-name", "description": "x-description" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/products");
  assertEquals(JSON.parse(calls[0].body!), { "name": "x-name", "description": "x-description" });
  assertEquals(out, REPLY);
});

Deno.test("product-create: omits every unset optional", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await productCreate.execute({ "name": "x-name" } as never, ctx);

  assertEquals(JSON.parse(calls[0].body!), { "name": "x-name" });
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("product-create: declares a perform action's idempotency", () => {
  assertEquals(productCreate.type, "perform");
  assertEquals(productCreate.idempotent, false);
  assertEquals(productCreate.params!.filter((p) => p.required).map((p) => p.key), ["name"]);
});
