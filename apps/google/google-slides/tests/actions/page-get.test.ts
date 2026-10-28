import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-get.ts";

Deno.test("page-get: GETs the page under the presentation", async () => {
  const { ctx, calls } = mockCtx([{ body: { objectId: "g1", pageType: "SLIDE" } }]);
  await action.execute({ presentationId: "p1", pageObjectId: "g1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/presentations/p1/pages/g1");
});

Deno.test("page-get: encodes an object ID containing reserved characters", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1", pageObjectId: "id.g2f/3" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1/pages/id.g2f%2F3");
});

Deno.test("page-get: unwraps a pasted editor URL for the presentation", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "https://docs.google.com/presentation/d/pp/edit", pageObjectId: "g1" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/pp/pages/g1");
});
