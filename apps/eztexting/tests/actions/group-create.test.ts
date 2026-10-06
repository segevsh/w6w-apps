import { assertEquals } from "@std/assert";
import groupCreate from "../../actions/group-create.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("group-create: calls POST /contact-groups and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "3" } }]);
  const result = await groupCreate.execute(
    { "name": "VIP", "phoneNumbers": "2125551234", "strictValidation": true } as never,
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups`);
  assertEquals(bodyOf(calls[0]), {
    "name": "VIP",
    "phoneNumbers": ["2125551234"],
    "strictValidation": true,
  });
  assertEquals(result, { "id": "3" });
});

Deno.test("group-create: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "3" } }]);
  await groupCreate.execute(
    { "name": "VIP", "phoneNumbers": "2125551234", "strictValidation": true } as never,
    ctx,
  );
  assertEquals(calls[0].headers["authorization"], undefined);
});
