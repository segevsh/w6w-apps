import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";
import workLocationDelete from "../../actions/work-location-delete.ts";

Deno.test("work-location-delete: DELETEs /work-locations/<id>/ and reports the 204", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  const out = await workLocationDelete.execute({ id: "w1" }, ctx);

  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/work-locations/w1/");
  assertEquals(calls[0].body, null);
  assertEquals(out, { deleted: true });
});

Deno.test("work-location-delete: refuses an empty id and surfaces a 404", async () => {
  const { ctx, calls } = mockCtx([{ status: 404, body: errorBody("Not found.") }]);
  await assertRejects(
    () => Promise.resolve().then(() => workLocationDelete.execute({ id: "" }, ctx)),
    Error,
    "id is required",
  );
  assertEquals(calls.length, 0);
  const err = await assertRejects(
    () => Promise.resolve().then(() => workLocationDelete.execute({ id: "gone" }, ctx)),
    Error,
  );
  assertStringIncludes(err.message, "404");
});
