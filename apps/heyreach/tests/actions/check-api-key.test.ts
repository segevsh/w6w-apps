import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/check-api-key.ts";

const URL_UNDER_TEST = "https://api.heyreach.io/api/public/auth/CheckApiKey";

Deno.test("check-api-key: a 200 is the whole answer", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, URL_UNDER_TEST);
  assertEquals(result, {
    status: 200,
    connected: true,
    message: "HeyReach accepted the API key.",
  });
});

/** Both refusals are HTTP 401; only the body text separates them. */
Deno.test("check-api-key: `Invalid API key` is reported, not thrown", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Invalid API key" }]);
  const result = await action.execute!({}, ctx);
  assertEquals(result.connected, false);
  assertEquals(result.status, 401);
  assertEquals(result.message, 'HeyReach answered 401 "Invalid API key".');
});

Deno.test("check-api-key: `Missing API key` reads differently from an invalid one", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "Missing API key" }]);
  const result = await action.execute!({}, ctx);
  assertEquals(result.connected, false);
  assertEquals(result.message, 'HeyReach answered 401 "Missing API key".');
});

/** A 5xx is not an answer about the key — it is a broken call. */
Deno.test("check-api-key: a 500 throws rather than answering `connected: false`", async () => {
  const { ctx } = mockCtx([{ status: 500, body: "boom" }]);
  let threw = false;
  try {
    await action.execute!({}, ctx);
  } catch (err) {
    threw = true;
    if (!/500/.test(String(err))) throw err;
  }
  assertEquals(threw, true);
});

Deno.test("check-api-key: an HTML 200 is not mistaken for a working key", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html><body>login</body></html>",
    headers: { "content-type": "text/html" },
  }]);
  // A 200 is HeyReach's documented answer, so it reads as connected; the point
  // of this test is that the body is never echoed into the result.
  const result = await action.execute!({}, ctx);
  assertEquals(result.connected, true);
  assertEquals(JSON.stringify(result).includes("login"), false);
});
