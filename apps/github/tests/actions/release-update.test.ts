import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-update.ts";

Deno.test("release-update: publishing a draft is a PATCH with draft:false", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute({ owner: "acme", repository: "api", releaseId: 1, draft: false }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].url, "https://api.github.com/repos/acme/api/releases/1");
  assertEquals(JSON.parse(calls[0].body!), { draft: false });
});
