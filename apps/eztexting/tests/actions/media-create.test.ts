import { assertEquals } from "@std/assert";
import mediaCreate from "../../actions/media-create.ts";
import { API_ROOT, bodyOf, mockCtx } from "../_helpers.ts";

Deno.test("media-create: calls POST /media-files and returns the documented shape", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5", name: "y.png" } }]);
  const result = await mediaCreate.execute({ "mediaUrl": "https://x/y.png" } as never, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url.split("?")[0], `${API_ROOT}/media-files`);
  assertEquals(bodyOf(calls[0]), { "mediaUrl": "https://x/y.png" });
  assertEquals(result, { "id": "5", "name": "y.png" });
});

Deno.test("media-create: carries no credential — auth is the sign hook's job", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "5", name: "y.png" } }]);
  await mediaCreate.execute({ "mediaUrl": "https://x/y.png" } as never, ctx);
  assertEquals(calls[0].headers["authorization"], undefined);
});
