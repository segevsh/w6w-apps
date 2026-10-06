import { assertEquals } from "@std/assert";
import api from "../../health/api.ts";
import { mockCtx } from "../_helpers.ts";

const ACCT = { status: 401, body: { error: { message: "Please provide a valid API key." } } };
const SEND = {
  status: 401,
  body: { success: false, message: "You have used an invalid API key." },
};

Deno.test("api: both hosts' schema-correct auth errors are a pass, unsigned", async () => {
  const { ctx, calls } = mockCtx([ACCT, SEND]);
  assertEquals(api.credential, "none");
  assertEquals((await api.check!({}, ctx)).state, "ok");
  assertEquals(calls[0].url, "https://api.maileroo.com/v1/account");
  assertEquals(calls[1].url, "https://smtp.maileroo.com/api/v2/emails/scheduled");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[1].headers["x-api-key"], undefined);
});

Deno.test("api: a 5xx on either host is down; a non-Maileroo 401 is unknown", async () => {
  const down = mockCtx([ACCT, { status: 502, body: "bad gateway" }]);
  assertEquals((await api.check!({}, down.ctx)).state, "down");
  const odd = mockCtx([
    { status: 401, headers: { "content-type": "text/html" }, body: "<html>" },
    SEND,
  ]);
  assertEquals((await api.check!({}, odd.ctx)).state, "unknown");
});

Deno.test("api: a network failure is down", async () => {
  const { ctx } = mockCtx();
  ctx.fetch = () => Promise.reject(new Error("dns"));
  const res = await api.check!({}, ctx);
  assertEquals(res.state, "down");
});
