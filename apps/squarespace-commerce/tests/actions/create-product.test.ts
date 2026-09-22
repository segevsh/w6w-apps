import { assertEquals, assertRejects } from "@std/assert";
import createProduct from "../../actions/create-product.ts";
import { API_ROOT, bodyOf, errorBody, mockCtx } from "../_helpers.ts";

const MINIMAL = { name: "Brine 32oz", storePageId: "SP1", type: "PHYSICAL" };

Deno.test("create-product: POST /v2/commerce/products with name, storePageId and type", async () => {
  const { ctx, calls } = mockCtx([{
    status: 201,
    body: { id: "P1", type: "PHYSICAL", storePageId: "SP1", name: "Brine 32oz" },
  }]);
  const out = await createProduct.execute!({ ...MINIMAL }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products`);
  assertEquals(bodyOf(calls[0]), MINIMAL);
  assertEquals(out.id, "P1");
});

Deno.test("create-product: the full optional set is carried through", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "P1" } }]);
  await createProduct.execute!({
    ...MINIMAL,
    description: "Spring mix",
    isVisible: true,
    tags: ["spring", "sale"],
    urlSlug: "brine-32oz",
    variants: [{ sku: "BRINE-M", pricing: { basePrice: { currency: "USD", value: 24.99 } } }],
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    ...MINIMAL,
    description: "Spring mix",
    isVisible: true,
    tags: ["spring", "sale"],
    urlSlug: "brine-32oz",
    variants: [{ sku: "BRINE-M", pricing: { basePrice: { currency: "USD", value: 24.99 } } }],
  });
});

Deno.test("create-product: `isVisible: false` survives the body build", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "P1" } }]);
  await createProduct.execute!({ ...MINIMAL, isVisible: false }, ctx);

  assertEquals(bodyOf(calls[0]).isVisible, false);
});

Deno.test("create-product: no Idempotency-Key, and the action is not idempotent", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "P1" } }]);
  await createProduct.execute!({ ...MINIMAL }, ctx);

  assertEquals(calls[0].headers["idempotency-key"], undefined);
  assertEquals(createProduct.idempotent, false);
});

Deno.test("create-product: a 400 STORE_PAGE_NOT_FOUND body is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorBody("INVALID_REQUEST_ERROR", {
      subtype: "STORE_PAGE_NOT_FOUND",
      message: "store page not found",
    }),
  }]);

  await assertRejects(
    async () => await createProduct.execute!({ ...MINIMAL, storePageId: "nope" }, ctx),
    Error,
    "STORE_PAGE_NOT_FOUND",
  );
});
