import { assert, assertEquals, assertRejects } from "@std/assert";
import formPublish from "../../actions/form-publish.ts";
import { errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("form-publish: POSTs form_uuid with published 1 by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "Your form was published successfully." } }]);
  await formPublish.execute({ formUuid: "f1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/forms/publish");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { form_uuid: "f1", published: 1 });
});

Deno.test("form-publish: published=false sends 0 (unpublish)", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await formPublish.execute({ formUuid: "f1", published: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { form_uuid: "f1", published: 0 });
});

Deno.test("form-publish: is idempotent", () => assertEquals(formPublish.idempotent, true));

Deno.test("form-publish: a vendor error surfaces its own message", async () => {
  const { ctx } = mockCtx([{ status: 401, body: errorBody("API key does not look valid") }]);
  const err = await assertRejects(
    () => Promise.resolve(formPublish.execute({ formUuid: "f1" }, ctx)),
    Error,
  );
  assert(err.message.includes("API key does not look valid"), err.message);
  assert(err.message.includes("401"), err.message);
});
