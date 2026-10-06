import { assertEquals } from "@std/assert";
import campaignGet from "../../actions/campaign-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-get: GETs /v3/campaigns/spring-appeal and unwraps the data envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "spring-appeal", name: "N" }) }]);
  const out = await campaignGet.execute({
    "campaign": "spring-appeal",
    "private": true,
    "includeTags": true,
    "pruneConfig": true,
  }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v3/campaigns/spring-appeal");
  assertEquals(queryOf(calls[0].url), {
    "private": "true",
    "includeTags": "true",
    "pruneConfig": "true",
  });
  assertEquals(out, { uuid: "spring-appeal", name: "N" });
});

Deno.test("campaign-get: the id is percent-encoded as one path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await campaignGet.execute({ campaign: "a/b c" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/campaigns/a%2Fb%20c");
});

Deno.test("campaign-get: a user accessToken in the response is stripped", async () => {
  const { ctx } = mockCtx([{
    body: envelope({ uuid: "x", user: { accessToken: "secret-token", email: "a@b.org" } }),
  }]);
  const out = JSON.stringify(await campaignGet.execute({ campaign: "x" }, ctx));
  assertEquals(out.includes("secret-token"), false);
  assertEquals(out.includes("a@b.org"), true);
});

Deno.test("campaign-get: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "not found", detail: "No such record" },
  }]);
  let message = "";
  try {
    await campaignGet.execute({ campaign: "x" }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 404"), true, message);
  assertEquals(message.includes("No such record"), true, message);
});
