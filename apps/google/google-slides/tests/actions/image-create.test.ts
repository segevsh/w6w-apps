import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/image-create.ts";

Deno.test("image-create: bare call sends the URL and just the page id", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ createImage: { objectId: "i1" } }] } }]);
  await action.execute(
    { presentationId: "p1", pageObjectId: "g1", url: "https://cdn.example.com/a.png" },
    ctx,
  );

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      createImage: {
        url: "https://cdn.example.com/a.png",
        elementProperties: { pageObjectId: "g1" },
      },
    }],
  });
});

Deno.test("image-create: folds size and transform in the units requested", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    presentationId: "p1",
    pageObjectId: "g1",
    url: "https://cdn.example.com/a.png",
    width: 200,
    height: 100,
    translateX: 50,
    translateY: 25,
    unit: "PT",
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!).requests[0].createImage.elementProperties, {
    pageObjectId: "g1",
    size: { width: { magnitude: 200, unit: "PT" }, height: { magnitude: 100, unit: "PT" } },
    transform: { scaleX: 1, scaleY: 1, translateX: 50, translateY: 25, unit: "PT" },
  });
});

Deno.test("image-create: a supplied objectId is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", pageObjectId: "g1", url: "https://x/a.png", objectId: "img1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).requests[0].createImage.objectId, "img1");
});
