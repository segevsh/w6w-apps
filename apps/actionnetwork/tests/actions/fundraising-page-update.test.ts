import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/fundraising-page-update.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT: Record<string, unknown> = {
  "fundraisingPageId": "action_network:fundraisingpageid",
  "title": "title text",
  "name": "name text",
  "description": "description text",
  "browserUrl": "browserUrl text",
  "tagList": [
    "alpha",
    "beta",
  ],
};

const REPLY = { identifiers: ["action_network:abc"], x: 1, _links: {} };

Deno.test("fundraising-page-update: sends PUT with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await action.execute!(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://actionnetwork.org/api/v2/fundraising_pages/fundraisingpageid",
  );
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), {
    "title": "title text",
    "name": "name text",
    "description": "description text",
    "browser_url": "browserUrl text",
    "tag_list": [
      "alpha",
      "beta",
    ],
  });
  assertEquals(out, {
    "id": "abc",
    "identifiers": [
      "action_network:abc",
    ],
    "x": 1,
  });
});

Deno.test("fundraising-page-update: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("osdi-api-token" in calls[0].headers), "the sign hook injects credentials, not actions");
  assertEquals(calls[0].headers.accept, "application/hal+json, application/json");
});

Deno.test("fundraising-page-update: surfaces a vendor error and never echoes the key", async () => {
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

Deno.test("fundraising-page-update: declares its type, params and output", () => {
  assertEquals(action.key, "fundraising-page-update");
  assertEquals(action.resource, "fundraising-page");
  assertEquals(action.type, "perform");
  assertEquals(action.idempotent, true);
  assert(action.params!.length === 6);
  assertEquals(Array.isArray(action.output) ? action.output.length : 0, 13);
});
