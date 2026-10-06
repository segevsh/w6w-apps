import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/tag-create.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT: Record<string, unknown> = {
  "name": "name text",
};

const REPLY = { identifiers: ["action_network:abc"], x: 1, _links: {} };

Deno.test("tag-create: sends POST with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await action.execute!(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://actionnetwork.org/api/v2/tags");
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "name": "name text",
  });
  assertEquals(out, {
    "id": "abc",
    "identifiers": [
      "action_network:abc",
    ],
    "x": 1,
  });
});

Deno.test("tag-create: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("osdi-api-token" in calls[0].headers), "the sign hook injects credentials, not actions");
  assertEquals(calls[0].headers.accept, "application/hal+json, application/json");
});

Deno.test("tag-create: surfaces a vendor error and never echoes the key", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: "API Key invalid or not present sk_live_SECRET" },
  }]);
  const err = await assertRejects(async () => await action.execute!(INPUT, ctx), Error, "HTTP 401");
  assert(
    !String(err.message).includes("sk_live_SECRET"),
    "the vendor echoes the key; it must be cut",
  );
});

Deno.test("tag-create: declares its type, params and output", () => {
  assertEquals(action.key, "tag-create");
  assertEquals(action.resource, "tag");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.params!.length === 1);
  assertEquals(Array.isArray(action.output) ? action.output.length : 0, 5);
});
