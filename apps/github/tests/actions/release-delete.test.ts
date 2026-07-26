import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-delete.ts";

Deno.test("release-delete: DELETEs the release", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await action.execute({ owner: "acme", repository: "api", releaseId: 3 }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/releases/3");
});
