import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/article-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const run = (i: Record<string, unknown>, ctx: Parameters<typeof action.execute>[1]) =>
  action.execute(i as never, ctx);

const base = { title: "Premium", type: "PRODUCT", unitName: "Stück", taxRate: 19 };

Deno.test("article-create: a NET price sends netPrice only, next to leadingPrice and taxRate", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a1", version: 0 } }]);
  const out = await run({
    ...base,
    leadingPrice: "NET",
    price: 61.9,
    gtin: "9783648170632",
  }, ctx) as {
    id: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/articles");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Premium",
    type: "PRODUCT",
    unitName: "Stück",
    gtin: "9783648170632",
    price: { leadingPrice: "NET", netPrice: 61.9, taxRate: 19 },
  });
  assertEquals(out.id, "a1");
});

Deno.test("article-create: a GROSS price sends grossPrice only; a 0 tax rate is kept", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "a2" } }]);
  await run({ ...base, taxRate: 0, leadingPrice: "GROSS", price: 10 }, ctx);
  assertEquals(JSON.parse(calls[0].body!).price, {
    leadingPrice: "GROSS",
    grossPrice: 10,
    taxRate: 0,
  });
});

Deno.test("article-create: required fields are checked before the network", async () => {
  const n = mockCtx();
  await assertRejects(
    async () => await run({ ...base, title: " ", leadingPrice: "NET", price: 1 }, n.ctx),
    Error,
    "Title",
  );
  await assertRejects(
    async () => await run({ ...base, unitName: "", leadingPrice: "NET", price: 1 }, n.ctx),
    Error,
    "Unit",
  );
  await assertRejects(
    async () => await run({ ...base, leadingPrice: "NET" }, n.ctx),
    Error,
    "Price",
  );
  await assertRejects(
    async () => await run({ ...base, taxRate: undefined, leadingPrice: "NET", price: 1 }, n.ctx),
    Error,
    "Tax rate",
  );
  assertEquals(n.calls.length, 0);
  assertEquals(action.idempotent, false);
});
