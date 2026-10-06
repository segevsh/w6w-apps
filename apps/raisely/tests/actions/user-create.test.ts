import { assertEquals } from "@std/assert";
import userCreate from "../../actions/user-create.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-create: POST /v3/users with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await userCreate.execute({
    "private": true,
    "merge": true,
    "email": "new@b.org",
    "firstName": "N",
    "lastName": "U",
    "postcode": "3000",
  }, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v3/users");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(bodyOf(calls[0]), {
    "data": { "email": "new@b.org", "firstName": "N", "lastName": "U", "postcode": "3000" },
    "merge": true,
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("user-create: is a perform action marked idempotent=false", () => {
  assertEquals(userCreate.type, "perform");
  assertEquals(userCreate.idempotent, false);
});

Deno.test("user-create: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await userCreate.execute({ "email": "e@b.org" }, ctx);
  assertEquals(bodyOf(calls[0]), { "data": { "email": "e@b.org" } });
});

Deno.test("user-create: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await userCreate.execute({
      "private": true,
      "merge": true,
      "email": "new@b.org",
      "firstName": "N",
      "lastName": "U",
      "postcode": "3000",
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("user-create: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await userCreate.execute({
      "private": true,
      "merge": true,
      "email": "new@b.org",
      "firstName": "N",
      "lastName": "U",
      "postcode": "3000",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
