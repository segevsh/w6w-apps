import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/selected-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("selected-get: GETs /selected with the selector and returns the inner HTML", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "text/html", "wsai-request-id": "r2" },
    body: "Example Domain",
  }]);
  const out = await action.execute({ url: "https://e.test", selector: "h1" }, ctx);
  assertEquals(out, { html: "Example Domain", requestId: "r2" });
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/selected");
  assertEquals(u.searchParams.get("selector"), "h1");
});

Deno.test("selected-get: a vendor 400 'Element not found' is surfaced; a blank selector makes no call", async () => {
  const { ctx } = mockCtx([{ status: 400, body: { message: "Element not found" } }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", selector: ".nope" }, ctx),
    Error,
    "Element not found",
  );
  const none = mockCtx();
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", selector: "" }, none.ctx),
    Error,
    "CSS selector is required",
  );
  assertEquals(none.calls.length, 0);
});
