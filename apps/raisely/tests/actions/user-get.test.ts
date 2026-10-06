import { assertEquals } from "@std/assert";
import userGet from "../../actions/user-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-get: GETs /v3/users/u-1 and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "u-1", name: "N" }) }]);
  const out = await userGet.execute({ "uuid": "u-1", "private": true }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/users/u-1");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(out, { uuid: "u-1", name: "N" });
});

Deno.test("user-get: the id is percent-encoded as one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await userGet.execute({ uuid: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/users/a%2Fb%20c");
});

Deno.test("user-get: a user accessToken in the response is stripped", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ uuid: "x", user: { accessToken: "secret-token", email: "a@b.org" } }),
  }]);
  const out = JSON.stringify(await userGet.execute({ uuid: "x" }, ctx));
  assertEquals(out.includes("secret-token"), false);
  assertEquals(out.includes("a@b.org"), true);
});

Deno.test("user-get: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "not found", detail: "No such record" },
  }]);
  let message = "";
  try {
    await userGet.execute({ uuid: "x" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 404"), true, message);
  assertEquals(message.includes("No such record"), true, message);
});
