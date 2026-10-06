import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  asList,
  CleverReachClient,
  describeError,
  errorOf,
  json,
  jsonObject,
  list,
  optEnum,
  optInt,
  pathId,
  unixTime,
} from "../../lib/client.ts";
import { mockCtx, unauthorized } from "../_helpers.ts";
import { receiverBody } from "../../lib/receiver.ts";

Deno.test("client: sends bearer-less requests (auth is the sign hook's job) to /v3", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await new CleverReachClient(ctx).request("/groups", { query: { order: "created ASC", x: "" } });
  assertEquals(calls[0].url, "https://rest.cleverreach.com/v3/groups?order=created+ASC");
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(calls[0].headers.accept, "application/json");
});

Deno.test("client: an error body fails even on 200; an empty body is null; non-JSON throws", async () => {
  await assertRejects(
    async () =>
      await new CleverReachClient(mockCtx([{ status: 200, body: unauthorized }]).ctx).request("/x"),
    Error,
    "CleverReach 200: Unauthorized (code 401)",
  );
  assertEquals(
    await new CleverReachClient(mockCtx([{ body: undefined }]).ctx).request("/x"),
    null,
  );
  await assertRejects(
    async () => await new CleverReachClient(mockCtx([{ body: "<html>" }]).ctx).request("/x"),
    Error,
    "non-JSON",
  );
});

Deno.test("client: a bare scalar body is returned as is", async () => {
  assertEquals(await new CleverReachClient(mockCtx([{ body: "true" }]).ctx).request("/x"), true);
});

Deno.test("errorOf: reads both of the vendor's error shapes and ignores everything else", () => {
  assertEquals(
    errorOf({ error: { code: 401, message: "Unauthorized" } }),
    "Unauthorized (code 401)",
  );
  assertEquals(
    errorOf({ error: "invalid_client", error_description: "bad" }),
    "invalid_client: bad",
  );
  assertEquals(errorOf({ error: "invalid_client" }), "invalid_client");
  assertEquals(errorOf([{ error: "x" }]), undefined);
  assertEquals(errorOf({ id: 1 }), undefined);
  assertEquals(errorOf(null), undefined);
});

Deno.test("describeError: classifies by status as a hint on top of the body", () => {
  assert(describeError(401, JSON.stringify(unauthorized)).includes("Extras → REST API"));
  assert(describeError(404, "").includes("wrong id"));
  assert(describeError(429, "").includes("back off"));
  assertEquals(describeError(500, ""), "HTTP 500");
});

Deno.test("param helpers validate and normalise", () => {
  assertEquals(pathId(" a@b.co ", "f"), "a%40b.co");
  assertThrows(() => pathId("", "f"), Error, "`f` is required");
  assertEquals(optInt("5", "n", 1, 9), 5);
  assertEquals(optInt(undefined, "n", 1, 9), undefined);
  assertThrows(() => optInt(1.5, "n", 1, 9), Error, "`n` must be an integer");
  assertThrows(() => optInt(0, "n", 1, 9), Error);
  assertEquals(optEnum("a", "e", ["a", "b"] as const), "a");
  assertThrows(() => optEnum("c", "e", ["a", "b"] as const), Error, "`e` must be one of");
  assertEquals(list("a, b\nc"), ["a", "b", "c"]);
  assertEquals(list([" a ", ""]), ["a"]);
  assertEquals(list(" "), undefined);
  assertEquals(json("[1]", "j"), [1]);
  assertThrows(() => json("{", "j"), Error, "not valid JSON");
  assertThrows(() => jsonObject("[1]", "j"), Error, "must be a JSON object");
  assertEquals(unixTime("1700000000", "t"), 1700000000);
  assertEquals(unixTime("2026-01-01T00:00:00Z", "t"), 1767225600);
  assertThrows(() => unixTime("soon", "t"), Error, "`t` must be");
  assertEquals(asList([1, 2]), { items: [1, 2], count: 2 });
  assertEquals(asList({ a: 1 }), { items: [], count: 0, raw: { a: 1 } });
});

Deno.test("receiverBody: maps params to the wire object and drops unset fields", () => {
  assertEquals(receiverBody({}), {});
  assertEquals(
    receiverBody({
      email: "a@b.co",
      deactivated: 0,
      globalAttributes: { x: "1" },
      tags: ["a"],
    }),
    { email: "a@b.co", deactivated: 0, global_attributes: { x: "1" }, tags: ["a"] },
  );
});
