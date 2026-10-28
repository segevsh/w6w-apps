import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/form-update-settings.ts";

Deno.test("form-update-settings: nests quizSettings and masks the nested path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", isQuiz: true }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      updateSettings: {
        settings: { quizSettings: { isQuiz: true } },
        updateMask: "quizSettings.isQuiz",
      },
    }],
  });
});

Deno.test("form-update-settings: carries emailCollectionType", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ formId: "f1", emailCollectionType: "VERIFIED" }, ctx);
  const req = JSON.parse(calls[0].body!).requests[0].updateSettings;
  assertEquals(req.settings, { emailCollectionType: "VERIFIED" });
  assertEquals(req.updateMask, "emailCollectionType");
});

Deno.test("form-update-settings: both fields produce a two-path mask", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { formId: "f1", isQuiz: false, emailCollectionType: "DO_NOT_COLLECT" },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).requests[0].updateSettings.updateMask,
    "quizSettings.isQuiz,emailCollectionType",
  );
});

Deno.test("form-update-settings: offers only the enum values FormSettings defines", () => {
  const param = action.params?.find((p) => p.key === "emailCollectionType");
  assertEquals(
    (param?.options as Array<{ value: string }>).map((o) => o.value),
    ["DO_NOT_COLLECT", "VERIFIED", "RESPONDER_INPUT"],
  );
});

Deno.test("form-update-settings: refuses to send an empty mask", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(() => action.execute({ formId: "f1" }, ctx), Error, "updateMask is required");
  assertEquals(calls.length, 0);
});
