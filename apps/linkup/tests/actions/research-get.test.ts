import { assertEquals } from "@std/assert";
import researchGet from "../../actions/research-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("research-get: GET /v1/research/:id", async () => {
  const task = {
    id: "r1",
    status: "completed",
    error: null,
    output: { answer: "a", sources: [] },
  };
  const g = mockCtx([{ body: task }]);
  const out = await researchGet.execute({ id: "r1" }, g.ctx);
  assertEquals(out.output, task.output);
  assertEquals(g.calls[0].url, "https://api.linkup.so/v1/research/r1");
});
