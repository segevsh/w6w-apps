import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-set-publish-settings.ts";

Deno.test("form-set-publish-settings: POSTs the :setPublishSettings method", async () => {
  const { ctx, calls } = mockCtx([{
    body: { formId: "f1", publishSettings: { publishState: { isPublished: true } } },
  }]);
  const result = await action.execute(
    { formId: "f1", isPublished: true, isAcceptingResponses: true },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "POST");
  assertEquals(url.pathname, "/v1/forms/f1:setPublishSettings");
  assertEquals(JSON.parse(calls[0].body!), {
    publishSettings: { publishState: { isPublished: true, isAcceptingResponses: true } },
    updateMask: "publishState",
  });
  assertEquals((result as { formId: string }).formId, "f1");
});

Deno.test("form-set-publish-settings: sends false booleans rather than omitting them", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", isPublished: false, isAcceptingResponses: false }, ctx);
  assertEquals(JSON.parse(calls[0].body!).publishSettings.publishState, {
    isPublished: false,
    isAcceptingResponses: false,
  });
});

Deno.test("form-set-publish-settings: honours an explicit updateMask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { formId: "f1", isPublished: true, isAcceptingResponses: true, updateMask: "*" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).updateMask, "*");
});

Deno.test("form-set-publish-settings: setting a fixed state is idempotent", () => {
  assertEquals(action.idempotent, true);
});
