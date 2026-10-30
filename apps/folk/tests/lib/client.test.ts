import { test } from "node:test";
import { assertEquals, assertRejects } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  errorMessage,
  FolkClient,
  NETWORK_PLACEHOLDER,
  networkPath,
} from "../../lib/client.ts";

test("networkPath: prefixes with the network placeholder", () => {
  assertEquals(networkPath("/groups"), `/network/${NETWORK_PLACEHOLDER}/groups`);
});

test("errorMessage: reads a `message` key", () => {
  assertEquals(errorMessage('{"message":"bad request"}'), "bad request");
});

test("errorMessage: reads an `error` key", () => {
  assertEquals(errorMessage('{"error":"nope"}'), "nope");
});

test("errorMessage: falls back to raw text when not JSON", () => {
  assertEquals(errorMessage("plain text failure"), "plain text failure");
});

test("errorMessage: empty text stays empty", () => {
  assertEquals(errorMessage(""), "");
});

test("compact: drops undefined keys only", () => {
  assertEquals(compact({ a: 1, b: undefined, c: 0, d: "" }), { a: 1, c: 0, d: "" });
});

test("FolkClient: GET decodes a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "u1" } }]);
  const out = await new FolkClient(ctx).request("/user");
  assertEquals(out, { id: "u1" });
  assertEquals(calls[0].url, "https://api.folk.app/user");
  assertEquals(calls[0].method, "GET");
});

test("FolkClient: POST sends a JSON body with content-type", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "p1" } }]);
  await new FolkClient(ctx).request("/network/n1/group/g1/person", {
    method: "POST",
    body: { fullName: "Ada" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(calls[0].body, JSON.stringify({ fullName: "Ada" }));
});

test("FolkClient: a non-ok response throws with the vendor's message", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "Not found." } }]);
  await assertRejects(
    () => new FolkClient(ctx).request("/network/n1/groups"),
    Error,
    "folk 404",
  );
});

test("FolkClient: an empty body resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 204, body: undefined }]);
  const out = await new FolkClient(ctx).request("/network/n1/group/g1/person/p1");
  assertEquals(out, undefined);
});
