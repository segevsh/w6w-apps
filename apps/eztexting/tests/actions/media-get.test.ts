import { assertEquals } from "@std/assert";
import mediaGet from "../../actions/media-get.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("media-get: calls GET /media-files/5 and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5", type: "image/png" } }]);
  const result = await mediaGet.execute({ "id": "5" } as never, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/media-files/5`);
  assertEquals(calls[0].body, null);
  assertEquals(result, { "id": "5", "type": "image/png" });
});

Deno.test("media-get: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5", type: "image/png" } }]);
  await mediaGet.execute({ "id": "5" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
