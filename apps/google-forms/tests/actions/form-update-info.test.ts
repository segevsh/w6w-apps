import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-update-info.ts";

Deno.test("form-update-info: wraps updateFormInfo and derives the mask", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({ formId: "f1", title: "New title", description: "New desc" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/forms/f1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      updateFormInfo: {
        info: { title: "New title", description: "New desc" },
        updateMask: "title,description",
      },
    }],
  });
});

Deno.test("form-update-info: a description-only edit masks only description", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", description: "only this" }, ctx);
  const req = JSON.parse(calls[0].body!).requests[0].updateFormInfo;
  assertEquals(req.info, { description: "only this" });
  assertEquals(req.updateMask, "description");
});

Deno.test("form-update-info: an explicit mask overrides the derived one", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", title: "t", updateMask: "*" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).requests[0].updateFormInfo.updateMask, "*");
});

Deno.test("form-update-info: refuses to send an empty mask", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => action.execute({ formId: "f1" }, ctx), Error, "updateMask is required");
  assertEquals(calls.length, 0);
});

Deno.test("form-update-info: setting a title to a fixed value is idempotent", () => {
  assertEquals(action.idempotent, true);
});
