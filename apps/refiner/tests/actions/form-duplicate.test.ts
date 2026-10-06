import { assert, assertEquals, assertRejects } from "@std/assert";
import formDuplicate from "../../actions/form-duplicate.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-duplicate: POSTs form_uuid and name and returns the new uuid", async () => {
  const reply = { message: "ok", source_form_uuid: "f1", new_form_uuid: "f2" };
  const { ctx, calls } = mockCtx([{ body: reply }]);
  const out = await formDuplicate.execute({ formUuid: "f1", name: "Copy" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/forms/duplicate");
  assertEquals(JSON.parse(calls[0].body!), { form_uuid: "f1", name: "Copy" });
  assertEquals(out, reply);
});

Deno.test("form-duplicate: is not idempotent", () => assertEquals(formDuplicate.idempotent, false));

Deno.test("form-duplicate: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(formDuplicate.execute({ formUuid: "f1", name: "Copy" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
