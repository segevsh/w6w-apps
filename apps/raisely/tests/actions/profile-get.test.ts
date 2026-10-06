import { assertEquals } from "@std/assert";
import profileGet from "../../actions/profile-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("profile-get: GETs /v3/profiles/jane-d and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "jane-d", name: "N" }) }]);
  const out = await profileGet.execute(
    { "path": "jane-d", "private": true, "campaign": "c1" },
    ctx,
  );

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/profiles/jane-d");
  assertEquals(queryOf(calls[0].url), { "private": "true", "campaign": "c1" });
  assertEquals(out, { uuid: "jane-d", name: "N" });
});

Deno.test("profile-get: the id is percent-encoded as one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await profileGet.execute({ path: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/profiles/a%2Fb%20c");
});

Deno.test("profile-get: a user accessToken in the response is stripped", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ uuid: "x", user: { accessToken: "secret-token", email: "a@b.org" } }),
  }]);
  const out = JSON.stringify(await profileGet.execute({ path: "x" }, ctx));
  assertEquals(out.includes("secret-token"), false);
  assertEquals(out.includes("a@b.org"), true);
});

Deno.test("profile-get: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "not found", detail: "No such record" },
  }]);
  let message = "";
  try {
    await profileGet.execute({ path: "x" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 404"), true, message);
  assertEquals(message.includes("No such record"), true, message);
});
