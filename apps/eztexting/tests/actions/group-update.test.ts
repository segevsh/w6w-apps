import { assertEquals } from "@std/assert";
import groupUpdate from "../../actions/group-update.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("group-update: calls PUT /contact-groups/3 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await groupUpdate.execute(
    { "id": "3", "name": "VIPs", "note": "top" } as never,
    ctx,
  );

  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups/3`);
  assertEquals(bodyOf(calls[0]), { "name": "VIPs", "note": "top" });
  assertEquals(result, { "id": "3", "status": 200 });
});

Deno.test("group-update: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await groupUpdate.execute({ "id": "3", "name": "VIPs", "note": "top" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
