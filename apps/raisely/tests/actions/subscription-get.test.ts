import { assertEquals } from "@std/assert";
import subscriptionGet from "../../actions/subscription-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscription-get: GETs /v3/subscriptions/s-1 and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "s-1", name: "N" }) }]);
  const out = await subscriptionGet.execute({ "uuid": "s-1", "private": true }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/subscriptions/s-1");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(out, { uuid: "s-1", name: "N" });
});

Deno.test("subscription-get: the id is percent-encoded as one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await subscriptionGet.execute({ uuid: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/subscriptions/a%2Fb%20c");
});

Deno.test("subscription-get: a user accessToken in the response is stripped", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ uuid: "x", user: { accessToken: "secret-token", email: "a@b.org" } }),
  }]);
  const out = JSON.stringify(await subscriptionGet.execute({ uuid: "x" }, ctx));
  assertEquals(out.includes("secret-token"), false);
  assertEquals(out.includes("a@b.org"), true);
});

Deno.test("subscription-get: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "not found", detail: "No such record" },
  }]);
  let message = "";
  try {
    await subscriptionGet.execute({ uuid: "x" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 404"), true, message);
  assertEquals(message.includes("No such record"), true, message);
});
