import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/submission-get.ts";

Deno.test("submission-get: reads one submission by id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: 1, status: "completed" } }]);
  assertEquals(await action.execute!({ id: 1 }, ctx), { id: 1, status: "completed" });
  assertEquals(calls[0].url, "https://api.docuseal.com/submissions/1");
  assertEquals(calls[0].method, "GET");
});
