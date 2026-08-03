import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/element-alt-text-update.ts";

Deno.test("element-alt-text-update: maps altTitle/altDescription onto title/description", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{}] } }]);
  await action.execute({
    presentationId: "p1",
    objectId: "img1",
    altTitle: "Revenue chart",
    altDescription: "Bar chart of revenue by quarter",
  }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      updatePageElementAltText: {
        objectId: "img1",
        title: "Revenue chart",
        description: "Bar chart of revenue by quarter",
      },
    }],
  });
});

Deno.test("element-alt-text-update: an omitted field is left out, not sent empty", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", objectId: "img1", altTitle: "Only a title" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).requests[0].updatePageElementAltText, {
    objectId: "img1",
    title: "Only a title",
  });
});

Deno.test("element-alt-text-update: an empty string is a real clear, not an omission", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", objectId: "img1", altDescription: "" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).requests[0].updatePageElementAltText, {
    objectId: "img1",
    description: "",
  });
});

Deno.test("element-alt-text-update: refuses a call that would change nothing", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () => action.execute({ presentationId: "p1", objectId: "img1" }, ctx),
    Error,
    "no-op",
  );
  assertEquals(calls.length, 0);
});

Deno.test("element-alt-text-update: is idempotent", () => {
  assertEquals(action.idempotent, true);
});
