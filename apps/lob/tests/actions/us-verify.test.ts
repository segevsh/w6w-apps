import { assertEquals, assertRejects } from "@std/assert";
import usVerify from "../../actions/us-verify.ts";
import { bodyOf, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("us-verify: split fields become snake_case body fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "us_ver_1", deliverability: "deliverable" } }]);
  const out = await usVerify.execute({
    primaryLine: "210 King St",
    city: "San Francisco",
    state: "CA",
    zipCode: "94107",
  }, ctx) as { deliverability: string };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/us_verifications");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(bodyOf(calls[0]), {
    primary_line: "210 King St",
    city: "San Francisco",
    state: "CA",
    zip_code: "94107",
  });
  assertEquals(out.deliverability, "deliverable");
});

Deno.test("us-verify: a free-form address is sent alone, and proper case goes in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "us_ver_2" } }]);
  await usVerify.execute({ address: "210 King St, San Francisco CA 94107", properCase: true }, ctx);
  assertEquals(bodyOf(calls[0]), { address: "210 King St, San Francisco CA 94107" });
  assertEquals(queryOf(calls[0].url), { case: "proper" });
});

Deno.test("us-verify: mixing the free-form address with fields is refused before a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await usVerify.execute({ address: "x", city: "y" }, ctx),
    Error,
    "not both",
  );
  assertEquals(calls.length, 0);
});

Deno.test("us-verify: neither form given is refused", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await usVerify.execute({ city: "SF" }, ctx),
    Error,
    "Primary line",
  );
});

Deno.test("us-verify: an undeliverable address is a normal result, not an error", async () => {
  const { ctx } = mockCtx([{ body: { id: "us_ver_3", deliverability: "undeliverable" } }]);
  const out = await usVerify.execute({ primaryLine: "1 Nowhere" }, ctx) as {
    deliverability: string;
  };
  assertEquals(out.deliverability, "undeliverable");
});

Deno.test("us-verify: an invalid key surfaces Lob's code", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: errorBody("invalid_api_key", "Your API key is not valid.", 401),
  }]);
  await assertRejects(
    async () => await usVerify.execute({ primaryLine: "x" }, ctx),
    Error,
    "invalid_api_key",
  );
});
