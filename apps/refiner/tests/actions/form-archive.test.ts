import { assert, assertEquals, assertRejects } from "@std/assert";
import formArchive from "../../actions/form-archive.ts";
import { errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("form-archive: DELETEs /v1/forms with form_uuid in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await formArchive.execute({ formUuid: "f1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), "/v1/forms");
  assertEquals(queryOf(calls[0].url), { form_uuid: "f1" });
  assertEquals(calls[0].body, null);
});

Deno.test("form-archive: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(formArchive.execute({ formUuid: "f1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
