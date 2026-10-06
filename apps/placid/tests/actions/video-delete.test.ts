import { assertEquals } from "@std/assert";
import imageDelete from "../../actions/image-delete.ts";
import pdfDelete from "../../actions/pdf-delete.ts";
import videoDelete from "../../actions/video-delete.ts";
import { assertRejects, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("image-delete / pdf-delete / video-delete: DELETE, 204 and 404", async () => {
  for (
    const [action, path] of [[imageDelete, "/images/3"], [pdfDelete, "/pdfs/3"], [
      videoDelete,
      "/videos/3",
    ]] as const
  ) {
    const { ctx, calls } = mockCtx([{ status: 204, body: undefined }]);
    assertEquals(await action.execute({ id: "3" }, ctx), { id: "3", deleted: true });
    assertEquals(calls[0].method, "DELETE");
    assertEquals(pathOf(calls[0].url), path);
    await assertRejects(() =>
      action.execute({ id: "3" }, mockCtx([{ status: 404, body: errorBody("nf") }]).ctx)
    );
  }
});
