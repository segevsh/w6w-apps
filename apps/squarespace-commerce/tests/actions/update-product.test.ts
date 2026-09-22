import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import updateProduct from "../../actions/update-product.ts";
import { API_ROOT, bodyOf, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("update-product: POST /v2/commerce/products/{productId} — a POST, not a PATCH", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "P1", name: "New name" } }]);
  const out = await updateProduct.execute!({ productId: "P1", name: "New name" }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/v2/commerce/products/P1`);
  assertEquals(out.name, "New name");
});

Deno.test("update-product: every supplied field is wrapped in {present, value}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "P1" } }]);
  await updateProduct.execute!({
    productId: "P1",
    name: "New name",
    description: "Text",
    isVisible: false,
    tags: ["a", "b"],
    urlSlug: "new-name",
    pricing: { basePrice: { present: true, value: { currency: "USD", value: 29.99 } } },
    productAttributeNames: ["Color"],
    seoData: { title: "SEO" },
  }, ctx);

  assertEquals(bodyOf(calls[0]), {
    name: { present: true, value: "New name" },
    description: { present: true, value: "Text" },
    // `false` survives: it is a value, not an absence.
    isVisible: { present: true, value: false },
    tags: { present: true, value: ["a", "b"] },
    urlSlug: { present: true, value: "new-name" },
    // `pricing` gets ONE wrapper here; its own members are the caller's nested Changes.
    pricing: {
      present: true,
      value: { basePrice: { present: true, value: { currency: "USD", value: 29.99 } } },
    },
    productAttributeNames: { present: true, value: ["Color"] },
    seoData: { present: true, value: { title: "SEO" } },
  });
});

Deno.test("update-product: an untouched field is absent, never wrapped as null", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "P1" } }]);
  await updateProduct.execute!({ productId: "P1", name: "Only the name" }, ctx);

  const body = bodyOf(calls[0]);
  assertEquals(Object.keys(body), ["name"]);
  assertEquals("description" in body, false);
  assertEquals("pricing" in body, false);
});

Deno.test("update-product: an empty body is rejected rather than sent as a no-op", () => {
  const { ctx } = mockCtx([]);
  assertThrows(
    () => updateProduct.execute!({ productId: "P1" }, ctx),
    Error,
    "at least one field",
  );
});

Deno.test("update-product: an empty string is a value, and is sent as one", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "P1" } }]);
  await updateProduct.execute!({ productId: "P1", description: "" }, ctx);

  assertEquals(bodyOf(calls[0]), { description: { present: true, value: "" } });
});

Deno.test("update-product: a 409 PRODUCT_UPDATE_CONFLICT body is surfaced", async () => {
  const { ctx } = mockCtx([{
    status: 409,
    body: errorBody("CONFLICT", {
      subtype: "PRODUCT_UPDATE_CONFLICT",
      message: "The product was modified",
    }),
  }]);

  await assertRejects(
    async () => await updateProduct.execute!({ productId: "P1", name: "x" }, ctx),
    Error,
    "409 CONFLICT/PRODUCT_UPDATE_CONFLICT",
  );
});
