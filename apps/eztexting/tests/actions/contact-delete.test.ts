import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("contact-delete: calls DELETE /contacts/2125551234 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await contactDelete.execute({ "phoneNumber": "2125551234" } as never, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contacts/2125551234`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "phoneNumber": "2125551234", "status": 200 });
});

Deno.test("contact-delete: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await contactDelete.execute({ "phoneNumber": "2125551234" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
