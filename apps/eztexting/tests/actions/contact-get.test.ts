import { assertEquals, assertRejects } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { API_ROOT, apiError, mockCtx } from "../_helpers.ts";

Deno.test("contact-get: calls GET /contacts/%2B12125551234 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { phoneNumber: "2125551234", optOut: false } }]);
  const result = await contactGet.execute({ "phoneNumber": "+12125551234" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/%2B12125551234`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "phoneNumber": "2125551234", "optOut": false });
});

Deno.test("contact-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { phoneNumber: "2125551234", optOut: false } }]);
  await contactGet.execute({ "phoneNumber": "+12125551234" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("contact-get: a 404 names the missing resource", async () => {
  const { ctx } = mockCtx([{ status: 404, body: apiError(404, "Contact not found") }]);
  await assertRejects(
    async () => await contactGet.execute({ phoneNumber: "1" }, ctx),
    Error,
    "404",
  );
});
