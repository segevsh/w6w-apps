import { assertEquals, assertRejects } from "@std/assert";
import addressCreate from "../../actions/address-create.ts";
import { bodyOf, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("address-create: POSTs a JSON body with Lob's snake_case field names", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "adr_1", object: "address" } }]);
  const out = await addressCreate.execute({
    name: "Harry Zhang",
    addressLine1: "210 King St",
    addressCity: "San Francisco",
    addressState: "CA",
    addressZip: "94107",
    metadata: '{"k":"v"}',
  }, ctx) as { id: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/addresses");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(bodyOf(calls[0]), {
    name: "Harry Zhang",
    address_line1: "210 King St",
    address_city: "San Francisco",
    address_state: "CA",
    address_zip: "94107",
    address_country: "US",
    metadata: { k: "v" },
  });
  assertEquals(out.id, "adr_1");
});

Deno.test("address-create: an international address keeps its country and omits unset fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "adr_2" } }]);
  await addressCreate.execute(
    { company: "Acme", addressLine1: "1 Main St", addressCountry: "CA" },
    ctx,
  );
  assertEquals(bodyOf(calls[0]), {
    company: "Acme",
    address_line1: "1 Main St",
    address_country: "CA",
  });
});

Deno.test("address-create: is declared non-idempotent", () => {
  assertEquals(addressCreate.idempotent, false);
});

Deno.test("address-create: invalid JSON metadata is rejected before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await addressCreate.execute({ addressLine1: "x", metadata: "{nope" }, ctx),
    Error,
    "Metadata is not valid JSON",
  );
  assertEquals(calls.length, 0);
});

Deno.test("address-create: a validation failure surfaces Lob's code and message", async () => {
  const { ctx } = mockCtx([{
    status: 422,
    body: errorBody("invalid", "address_zip is required", 422),
  }]);
  await assertRejects(
    async () => await addressCreate.execute({ addressLine1: "x" }, ctx),
    Error,
    "invalid",
  );
});
