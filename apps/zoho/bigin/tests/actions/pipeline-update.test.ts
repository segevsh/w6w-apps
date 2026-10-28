import { assertEquals } from "@std/assert";
import { mockBiginCtx, recordResult } from "../_helpers.ts";
import action from "../../actions/pipeline-update.ts";

Deno.test("pipeline-update: PUTs to the record path with the id in the documented body", async () => {
  const { ctx, calls } = mockBiginCtx([{ body: recordResult("42") }]);
  await action.execute({ recordId: "42", fields: { Stage: "Closed Won" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(new URL(calls[0].url).pathname, "/bigin/v2/Pipelines/42");
  assertEquals(JSON.parse(calls[0].body ?? ""), { data: [{ id: "42", Stage: "Closed Won" }] });
});
