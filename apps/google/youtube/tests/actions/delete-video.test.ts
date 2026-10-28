import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/delete-video.ts";

Deno.test("delete-video: DELETEs /youtube/v3/videos?id= and sends no part", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await action.execute!({ id: "v1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(url.pathname, "/youtube/v3/videos");
  assertEquals(url.searchParams.get("id"), "v1");
  // This method has no `part` — sending one would be wrong, not merely useless.
  assertEquals(url.searchParams.get("part"), null);
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
});

Deno.test("delete-video: turns an empty 204 into a branchable result", async () => {
  const { ctx } = mockCtx([{ status: 204 }]);
  assertEquals(await action.execute!({ id: "v1" }, ctx), { deleted: true });
});

Deno.test("delete-video: declares no part parameter at all", () => {
  assert(!action.params!.some((p) => p.key === "part"));
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
});
