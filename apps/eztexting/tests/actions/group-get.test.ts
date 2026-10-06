import { assertEquals } from "@std/assert";
import groupGet from "../../actions/group-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("group-get: calls GET /contact-groups/3 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3", name: "VIP", contactsCount: 12 } }]);
  const result = await groupGet.execute({ "id": "3" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups/3`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "id": "3", "name": "VIP", "contactsCount": 12 });
});

Deno.test("group-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "3", name: "VIP", contactsCount: 12 } }]);
  await groupGet.execute({ "id": "3" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
