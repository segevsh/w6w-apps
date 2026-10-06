import { assertEquals, assertRejects } from "@std/assert";
import intlVerify from "../../actions/intl-verify.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("intl-verify: sends the split fields plus the country", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "intl_ver_1", deliverability: "deliverable" } }]);
  const out = await intlVerify.execute({
    country: "GB",
    primaryLine: "10 Downing St",
    city: "London",
    postalCode: "SW1A 2AA",
  }, ctx) as { deliverability: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/intl_verifications");
  assertEquals(bodyOf(calls[0]), {
    primary_line: "10 Downing St",
    city: "London",
    postal_code: "SW1A 2AA",
    country: "GB",
  });
  assertEquals(calls[0].headers["x-lang-output"], undefined);
  assertEquals(out.deliverability, "deliverable");
});

Deno.test("intl-verify: free-form address and output language header", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "intl_ver_2" } }]);
  await intlVerify.execute({
    country: "DE",
    address: "Unter den Linden 77, Berlin",
    langOutput: "native",
  }, ctx);
  assertEquals(bodyOf(calls[0]), { address: "Unter den Linden 77, Berlin", country: "DE" });
  assertEquals(calls[0].headers["x-lang-output"], "native");
});

Deno.test("intl-verify: mixing free-form and fields is refused", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await intlVerify.execute({ country: "GB", address: "x", city: "y" }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("intl-verify: no address at all is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await intlVerify.execute({ country: "GB" }, ctx),
    Error,
    "Primary line",
  );
});

Deno.test("intl-verify: a rejected request surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{ status: 422, body: errorBody("invalid", "country is invalid", 422) }]);
  await assertRejects(
    async () => await intlVerify.execute({ country: "ZZ", primaryLine: "x" }, ctx),
    Error,
    "invalid",
  );
});
