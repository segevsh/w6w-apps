import { assertEquals } from "@std/assert";
import userUpdate from "../../actions/user-update.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("user-update: PATCH /v3/users/u-1 with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await userUpdate.execute({
    "uuid": "u-1",
    "private": true,
    "email": "a@b.org",
    "phoneNumber": "123",
    "country": "AU",
    "public": { "tier": "gold" },
    "overwriteCustomFields": false,
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/users/u-1");
  assertEquals(queryOf(calls[0].url), { "private": "true" });
  assertEquals(bodyOf(calls[0]), {
    "data": {
      "email": "a@b.org",
      "phoneNumber": "123",
      "country": "AU",
      "public": { "tier": "gold" },
    },
    "overwriteCustomFields": false,
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("user-update: is a perform action marked idempotent=true", () => {
  assertEquals(userUpdate.type, "perform");
  assertEquals(userUpdate.idempotent, true);
});

Deno.test("user-update: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await userUpdate.execute({ "uuid": "u" }, ctx);
  assertEquals(bodyOf(calls[0]), { "data": {} });
});

Deno.test("user-update: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await userUpdate.execute({
      "uuid": "u-1",
      "private": true,
      "email": "a@b.org",
      "phoneNumber": "123",
      "country": "AU",
      "overwriteCustomFields": false,
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("user-update: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await userUpdate.execute({
      "uuid": "u-1",
      "private": true,
      "email": "a@b.org",
      "phoneNumber": "123",
      "country": "AU",
      "public": { "tier": "gold" },
      "overwriteCustomFields": false,
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
