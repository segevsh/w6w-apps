import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/presentation-get.ts";

Deno.test("presentation-get: GETs the presentation by raw ID", async () => {
  const { ctx, calls } = mockCtx([{ body: { presentationId: "p1", slides: [] } }]);
  await action.execute({ presentationId: "p1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(calls[0].method, "GET");
  assertEquals(url.pathname, "/v1/presentations/p1");
  assertEquals(calls[0].body, null);
});

Deno.test("presentation-get: unwraps a pasted editor URL", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "https://docs.google.com/presentation/d/abc_123/edit#slide=id.g1" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/abc_123");
});

Deno.test("presentation-get: sends no field mask — the method has no parameters but the ID", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ presentationId: "p1" }, ctx);
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(action.type, "read");
});
