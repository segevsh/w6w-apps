import { assertEquals, assertRejects } from "@std/assert";
import messageDelete from "../../actions/message-delete.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("message-delete: calls DELETE /messages and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await messageDelete.execute({ "ids": ["11", "12"] } as never, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/messages`);
  assertEquals(bodyOf(calls[0]), { "ids": [11, 12] });
  assertEquals(result, { "ids": [11, 12], "status": 200 });
});

Deno.test("message-delete: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await messageDelete.execute({ "ids": ["11", "12"] } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});

Deno.test("message-delete: refuses a non-numeric id before calling the API", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await messageDelete.execute({ ids: ["abc"] }, ctx),
    Error,
    "numeric",
  );
  assertEquals(calls.length, 0);
});
