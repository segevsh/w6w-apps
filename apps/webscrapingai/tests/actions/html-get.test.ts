import { assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/html-get.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("html-get: GETs /html and returns the HTML body with the request id", async () => {
  const { ctx, calls } = mockCtx([{
    headers: { "content-type": "text/html", "wsai-request-id": "r9" },
    body: "<html><h1>Hi</h1></html>",
  }]);
  const out = await action.execute({ url: "https://e.test" }, ctx);
  assertEquals(out, { html: "<html><h1>Hi</h1></html>", requestId: "r9" });
  const u = new URL(calls[0].url);
  assertEquals(u.pathname, "/html");
  assertEquals([...u.searchParams.keys()], ["url"]);
});

Deno.test("html-get: js_script and return_script_result are sent only when set; the result is returned raw", async () => {
  const { ctx, calls } = mockCtx([{ body: "42" }]);
  const out = await action.execute({
    url: "https://e.test",
    jsScript: "6*7",
    returnScriptResult: true,
    waitFor: "#c",
    jsTimeout: 5000,
    timeout: 20000,
    device: "mobile",
    errorOn404: true,
    errorOnRedirect: true,
  }, ctx);
  assertEquals(out, { scriptResult: "42", requestId: undefined });
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("js_script"), "6*7");
  assertEquals(q.get("return_script_result"), "true");
  assertEquals(q.get("wait_for"), "#c");
  assertEquals(q.get("js_timeout"), "5000");
  assertEquals(q.get("timeout"), "20000");
  assertEquals(q.get("device"), "mobile");
  assertEquals(q.get("error_on_404"), "true");
  assertEquals(q.get("error_on_redirect"), "true");
});

Deno.test("html-get: 402 and 403 carry an actionable hint; an invalid proxy type makes no call", async () => {
  const c402 = mockCtx([{ status: 402, body: { message: "Your requests quota is exceeded." } }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test" }, c402.ctx),
    Error,
    "out of API credits",
  );
  const c403 = mockCtx([{ status: 403, body: { message: "Wrong API key." } }]);
  await assertRejects(
    async () => await action.execute({ url: "https://e.test" }, c403.ctx),
    Error,
    "reconnect this connection",
  );
  const none = mockCtx();
  await assertRejects(
    async () => await action.execute({ url: "https://e.test", proxy: "tor" }, none.ctx),
    Error,
    "Proxy type",
  );
  assertEquals(none.calls.length, 0);
});
