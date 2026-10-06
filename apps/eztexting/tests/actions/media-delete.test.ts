import { assertEquals } from "@std/assert";
import mediaDelete from "../../actions/media-delete.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("media-delete: calls DELETE /media-files/5 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  const result = await mediaDelete.execute({ "id": "5" } as never, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/media-files/5`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "id": "5", "status": 200 });
});

Deno.test("media-delete: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: "" }]);
  await mediaDelete.execute({ "id": "5" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
