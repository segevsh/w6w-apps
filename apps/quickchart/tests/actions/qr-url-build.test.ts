import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/qr-url-build.ts";
import { exec, mockCtx } from "../_helpers.ts";

Deno.test("qr-url-build: POSTs /qr-url and returns the URL, sending no key", async () => {
  const { ctx, calls } = mockCtx([{ body: { url: "https://quickchart.io/qr?text=hi&size=200" } }]);
  const out = await exec(action, { text: "hi", size: 200 }, ctx);
  assertEquals(calls[0].url, "https://quickchart.io/qr-url");
  assertEquals(JSON.parse(calls[0].body!), { text: "hi", size: 200 });
  assertEquals(out, { url: "https://quickchart.io/qr?text=hi&size=200" });
});

Deno.test("qr-url-build: a missing url or a 400 is an error", async () => {
  await assertRejects(
    () => exec(action, { text: "x" }, mockCtx([{ body: {} }]).ctx),
    Error,
    "without a url",
  );
  await assertRejects(
    () => exec(action, { text: "" }, mockCtx([{ status: 400, body: { error: "bad" } }]).ctx),
    Error,
    "bad",
  );
});
