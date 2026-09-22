import { assertEquals } from "@std/assert";
import labelDelete from "../../actions/label-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("label-delete: DELETEs by label id and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await labelDelete.execute({ labelId: 555 }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v2/labels/555");
  assertEquals(result, { deleted: true, status: 200 });
});

/** The id is the attachment's, not the master label's — the hint has to say so. */
Deno.test("label-delete: the hint distinguishes the label from the master label", () => {
  assertEquals(/not the master label id/.test(labelDelete.params?.[0].hint ?? ""), true);
});
