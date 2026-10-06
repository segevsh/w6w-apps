import { assertEquals, assertRejects } from "@std/assert";
import extractGet from "../../actions/extract-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("extract-get: GET /v1/extract/:id", async () => {
  const task = {
    id: "ex 1",
    status: "completed",
    error: null,
    output: { resultUrl: "https://r", rowsReturned: 3, creditsUsed: 1 },
  };
  const { ctx, calls } = mockCtx([{ body: task }]);
  const out = await extractGet.execute({ id: "ex 1" }, ctx);
  assertEquals(out.output, task.output);
  assertEquals(out.status, "completed");
  assertEquals(calls[0].url, "https://api.linkup.so/v1/extract/ex%201");
  await assertRejects(
    async () => await extractGet.execute({ id: " " }, ctx),
    Error,
    "id is required",
  );
});
