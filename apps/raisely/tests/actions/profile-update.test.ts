import { assertEquals } from "@std/assert";
import profileUpdate from "../../actions/profile-update.ts";
import { bodyOf, envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("profile-update: PATCH /v3/profiles/jane-d with the documented wrapped body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ uuid: "r-1" }) }]);
  const out = await profileUpdate.execute({
    "path": "jane-d",
    "campaign": "c1",
    "private": true,
    "partial": true,
    "name": "Jane",
    "newPath": "jane",
    "goal": 1000,
    "type": "INDIVIDUAL",
  }, ctx);

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v3/profiles/jane-d");
  assertEquals(queryOf(calls[0].url), { "campaign": "c1", "private": "true", "partial": "true" });
  assertEquals(bodyOf(calls[0]), {
    "data": { "name": "Jane", "path": "jane", "goal": 1000, "type": "INDIVIDUAL" },
  });
  assertEquals(out, { uuid: "r-1" });
});

Deno.test("profile-update: is a perform action marked idempotent=true", () => {
  assertEquals(profileUpdate.type, "perform");
  assertEquals(profileUpdate.idempotent, true);
});

Deno.test("profile-update: only the fields given are sent", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({}) }]);
  await profileUpdate.execute({ "path": "p" }, ctx);
  assertEquals(bodyOf(calls[0]), { "data": {} });
});

Deno.test("profile-update: malformed JSON in a custom-field param fails before any request", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await profileUpdate.execute({
      "path": "jane-d",
      "campaign": "c1",
      "private": true,
      "partial": true,
      "name": "Jane",
      "newPath": "jane",
      "goal": 1000,
      "type": "INDIVIDUAL",
      public: "{not json",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message, "public is not valid JSON");
  assertEquals(calls.length, 0);
});

Deno.test("profile-update: an HTTP error becomes a readable Raisely error", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { code: "unauthorized", detail: "You must login again" },
  }]);
  let message = "";
  try {
    await profileUpdate.execute({
      "path": "jane-d",
      "campaign": "c1",
      "private": true,
      "partial": true,
      "name": "Jane",
      "newPath": "jane",
      "goal": 1000,
      "type": "INDIVIDUAL",
    }, ctx);
  } catch (e) {
    message = (e as Error).message;
  }
  assertEquals(message.includes("Raisely 401"), true, message);
  assertEquals(message.includes("You must login again"), true, message);
});
