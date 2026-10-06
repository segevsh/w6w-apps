import { assertEquals } from "@std/assert";
import groupDelete from "../../actions/group-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("group-delete: calls DELETE /contact-groups/3 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await groupDelete.execute({ "id": "3" } as never, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/contact-groups/3`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "id": "3", "status": 200 });
});

Deno.test("group-delete: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await groupDelete.execute({ "id": "3" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
