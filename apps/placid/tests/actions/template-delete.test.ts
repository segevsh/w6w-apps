import { assertEquals } from "@std/assert";
import templateDelete from "../../actions/template-delete.ts";
import { assertRejects, errorBody, mockCtx } from "../_helpers.ts";

Deno.test("template-delete: DELETE; 200 with no body is fine; 404 surfaces", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  assertEquals(await templateDelete.execute({ template_uuid: "t" }, ctx), {
    uuid: "t",
    deleted: true,
  });
  assertEquals(calls[0].method, "DELETE");
  await assertRejects(() =>
    templateDelete.execute(
      { template_uuid: "t" },
      mockCtx([{ status: 404, body: errorBody("nf") }]).ctx,
    )
  );
});
