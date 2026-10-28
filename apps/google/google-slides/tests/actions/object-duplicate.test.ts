import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/object-duplicate.ts";

Deno.test("object-duplicate: sends only the objectId when no map is supplied", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ duplicateObject: { objectId: "c" } }] } }]);
  await action.execute({ presentationId: "p1", objectId: "slide1" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{ duplicateObject: { objectId: "slide1" } }],
  });
});

Deno.test("object-duplicate: forwards the original→copy ID map", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    presentationId: "p1",
    objectId: "slide1",
    objectIds: { slide1: "slide1_copy", title1: "title1_copy" },
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).requests[0].duplicateObject.objectIds, {
    slide1: "slide1_copy",
    title1: "title1_copy",
  });
});

Deno.test("object-duplicate: an empty map is omitted rather than sent as {}", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", objectId: "s1", objectIds: {} }, ctx);
  assertEquals(
    Object.keys(JSON.parse(calls[0].body!).requests[0].duplicateObject),
    ["objectId"],
  );
});
