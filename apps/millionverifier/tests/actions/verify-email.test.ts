import { assert, assertEquals, assertRejects } from "@std/assert";
import verifyEmail from "../../actions/verify-email.ts";
import { mockCtx, run } from "../_helpers.ts";

const OK = {
  email: "bob@gmail.com",
  quality: "good",
  result: "ok",
  resultcode: 1,
  subresult: "ok",
  free: true,
  role: false,
  didyoumean: "",
  credits: 99,
  executiontime: 12,
  error: "",
  livemode: true,
};

Deno.test("verify-email: GETs /api/v3/ on the single host and maps the result", async () => {
  const { ctx, calls } = mockCtx([{ body: OK }]);
  const out = await run(verifyEmail, { email: " bob@gmail.com ", timeout: 10 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.millionverifier.com");
  assertEquals(url.pathname, "/api/v3/");
  assertEquals(url.searchParams.get("email"), "bob@gmail.com");
  assertEquals(url.searchParams.get("timeout"), "10");
  assertEquals(url.searchParams.has("api"), false); // the credential is added by sign
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(out.result, "ok");
  assertEquals(out.resultCode, 1);
  assertEquals(out.didYouMean, undefined);
  assertEquals(out.credits, 99);
  assertEquals(out.liveMode, true);
});

Deno.test("verify-email: a HTTP 200 body with an error string throws", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: { email: "x@y.com", result: "error", resultcode: 4, error: "apikey_not_found" },
  }]);
  const err = await assertRejects(() => run(verifyEmail, { email: "x@y.com" }, ctx));
  assert((err as Error).message.includes("apikey_not_found"));
  assert((err as Error).message.includes("API key was not recognised"));
});

Deno.test("verify-email: result error with an empty error is data, not a failure", async () => {
  const { ctx } = mockCtx([{ body: { ...OK, result: "error", resultcode: 4, error: "" } }]);
  assertEquals((await run(verifyEmail, { email: "a@b.com" }, ctx)).result, "error");
});

Deno.test("verify-email: validates email and the 2-60 timeout before any request", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(() => run(verifyEmail, { email: " " }, ctx), Error, "email is required");
  await assertRejects(
    () => run(verifyEmail, { email: "a@b.com", timeout: 1 }, ctx),
    Error,
    "timeout",
  );
  await assertRejects(
    () => run(verifyEmail, { email: "a@b.com", timeout: 61 }, ctx),
    Error,
    "timeout",
  );
  assertEquals(calls.length, 0);
});
