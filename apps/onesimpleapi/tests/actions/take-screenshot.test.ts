import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/take-screenshot.ts";

Deno.test("take-screenshot: GETs /screenshot with the url query param", async () => {
  const body = { url: "https://cdn.opq.to/x.png", width: 1280, height: 800 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ url: "https://example.com" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/screenshot");
  assertEquals(url.searchParams.get("url"), "https://example.com");
  assertEquals(url.searchParams.has("screen"), false);
  assertEquals(url.searchParams.has("full"), false);
  assertEquals(result, body);
});

Deno.test("take-screenshot: forwards screen/full/background/force as yes/no strings", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "x" } }]);
  await action.execute!(
    { url: "https://example.com", screen: "retina", full: true, background: false, force: true },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("screen"), "retina");
  assertEquals(url.searchParams.get("full"), "yes");
  assertEquals(url.searchParams.get("background"), "no");
  assertEquals(url.searchParams.get("force"), "yes");
});

Deno.test("take-screenshot: omits force when false", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "x" } }]);
  await action.execute!({ url: "https://example.com", force: false }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("force"), false);
});
