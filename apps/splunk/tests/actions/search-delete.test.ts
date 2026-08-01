import { assertEquals } from "@std/assert";
import { mockSplunkCtx } from "../_helpers.ts";
import action from "../../actions/search-delete.ts";

Deno.test("search-delete: DELETEs the job by sid", async () => {
  const { ctx, calls } = mockSplunkCtx([{ status: 200, body: { messages: [] } }]);
  const out = await action.execute({ sid: "123.45" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/services/search/jobs/123.45");
  assertEquals(out, { deleted: true });
});
