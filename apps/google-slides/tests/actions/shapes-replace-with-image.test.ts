import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shapes-replace-with-image.ts";

Deno.test("shapes-replace-with-image: builds the request and lifts occurrencesChanged", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      presentationId: "p1",
      replies: [{ replaceAllShapesWithImage: { occurrencesChanged: 2 } }],
    },
  }]);
  const out = await action.execute(
    { presentationId: "p1", containsText: "{{logo}}", imageUrl: "https://cdn.example.com/l.png" },
    ctx,
  ) as { occurrencesChanged: number };

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      replaceAllShapesWithImage: {
        imageUrl: "https://cdn.example.com/l.png",
        containsText: { text: "{{logo}}", matchCase: false },
      },
    }],
  });
  assertEquals(out.occurrencesChanged, 2);
});

Deno.test("shapes-replace-with-image: sends the modern imageReplaceMethod only", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ replaceAllShapesWithImage: {} }] } }]);
  await action.execute({
    presentationId: "p1",
    containsText: "x",
    imageUrl: "https://cdn.example.com/l.png",
    imageReplaceMethod: "CENTER_CROP",
  }, ctx);
  const request = JSON.parse(calls[0].body!).requests[0].replaceAllShapesWithImage;
  assertEquals(request.imageReplaceMethod, "CENTER_CROP");
  // The deprecated `replaceMethod` must never be emitted.
  assertEquals("replaceMethod" in request, false);
  const paramKeys = (action.params ?? []).map((p) => p.key);
  assertEquals(paramKeys.includes("replaceMethod"), false);
});

Deno.test("shapes-replace-with-image: an unmatched 200 normalises to 0", async () => {
  const { ctx } = mockCtx([{ body: { replies: [{ replaceAllShapesWithImage: {} }] } }]);
  const out = await action.execute(
    { presentationId: "p1", containsText: "nope", imageUrl: "https://cdn.example.com/l.png" },
    ctx,
  ) as { occurrencesChanged: number };
  assertEquals(out.occurrencesChanged, 0);
});

Deno.test("shapes-replace-with-image: failIfNoMatch raises on a zero-match 200", async () => {
  const { ctx } = mockCtx([{ body: { replies: [{ replaceAllShapesWithImage: {} }] } }]);
  await assertRejects(
    async () => {
      await action.execute({
        presentationId: "p1",
        containsText: "nope",
        imageUrl: "https://cdn.example.com/l.png",
        failIfNoMatch: true,
      }, ctx);
    },
    Error,
    "matched nothing",
  );
});

Deno.test("shapes-replace-with-image: forwards pageObjectIds and the revision guard", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ replaceAllShapesWithImage: {} }] } }]);
  await action.execute({
    presentationId: "p1",
    containsText: "x",
    imageUrl: "https://cdn.example.com/l.png",
    pageObjectIds: ["g1"],
    requiredRevisionId: "r5",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.requests[0].replaceAllShapesWithImage.pageObjectIds, ["g1"]);
  assertEquals(body.writeControl, { requiredRevisionId: "r5" });
});
