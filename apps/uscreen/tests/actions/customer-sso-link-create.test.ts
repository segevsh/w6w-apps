import { assertEquals, assertRejects } from "@std/assert";
import customerSsoLinkCreate from "../../actions/customer-sso-link-create.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("customer-sso-link-create: sends POST /customers/${seg(input.customerId)}/tokenized_url", async () => {
  const { ctx, calls } = mockCtx([{ body: { "url": "https://x/sso?t=1" } }]);
  const out = await customerSsoLinkCreate.execute({ "customerId": "a@b.co" } as never, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/publisher_api/v1/customers/a%40b.co/tokenized_url");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(calls[0].body, null);
  assertEquals(out, { "url": "https://x/sso?t=1" });
});

Deno.test("customer-sso-link-create: a 422 surfaces the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 422, body: { message: "bad input" } }]);
  await assertRejects(
    () =>
      customerSsoLinkCreate.execute({ "customerId": "a@b.co" } as never, ctx) as Promise<unknown>,
    Error,
    "bad input",
  );
});
