import { assertEquals, assertThrows } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/slide-create.ts";

Deno.test("slide-create: bare call appends a slide with no layout reference", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ createSlide: { objectId: "g9" } }] } }]);
  await action.execute({ presentationId: "p1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), { requests: [{ createSlide: {} }] });
});

Deno.test("slide-create: emits predefinedLayout and the insertion index", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", predefinedLayout: "TITLE_AND_BODY", insertionIndex: 2 },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].createSlide, {
    insertionIndex: 2,
    slideLayoutReference: { predefinedLayout: "TITLE_AND_BODY" },
  });
});

Deno.test("slide-create: layoutId wins and only one union arm is ever sent", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", predefinedLayout: "BLANK", layoutId: "layout-7" },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).requests[0].createSlide.slideLayoutReference,
    { layoutId: "layout-7" },
  );
});

Deno.test("slide-create: placeholder mappings nest under layoutPlaceholder", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    presentationId: "p1",
    predefinedLayout: "TITLE_AND_BODY",
    placeholderIdMappings: [
      { layoutPlaceholderType: "TITLE", layoutPlaceholderIndex: 0, objectId: "t1" },
      { layoutPlaceholderObjectId: "lp-body", objectId: "b1" },
    ],
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!).requests[0].createSlide.placeholderIdMappings, [
    { layoutPlaceholder: { type: "TITLE", index: 0 }, objectId: "t1" },
    { layoutPlaceholderObjectId: "lp-body", objectId: "b1" },
  ]);
});

Deno.test("slide-create: placeholder index defaults to 0 when omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    presentationId: "p1",
    predefinedLayout: "TITLE",
    placeholderIdMappings: [{ layoutPlaceholderType: "CENTERED_TITLE", objectId: "t1" }],
  }, ctx);
  assertEquals(
    JSON.parse(calls[0].body!).requests[0].createSlide.placeholderIdMappings[0].layoutPlaceholder,
    { type: "CENTERED_TITLE", index: 0 },
  );
});

Deno.test("slide-create: placeholder mappings without a layout are rejected locally", () => {
  const { ctx, calls } = mockCtx([]);
  assertThrows(
    () =>
      action.execute({
        presentationId: "p1",
        placeholderIdMappings: [{ layoutPlaceholderType: "TITLE", objectId: "t1" }],
      }, ctx),
    Error,
    "requires a layout",
  );
  assertEquals(calls.length, 0);
});

Deno.test("slide-create: forwards the revision guard", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", requiredRevisionId: "r3" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).writeControl, { requiredRevisionId: "r3" });
});
