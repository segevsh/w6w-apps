import { assert, assertEquals, assertRejects } from "@std/assert";
import action from "../../actions/donation-list.ts";
import { mockCtx } from "../_helpers.ts";

const INPUT: Record<string, unknown> = {
  "fundraisingPageId": "action_network:fundraisingpageid",
  "filter": "modified_date gt '2026-01-01'",
  "page": 2,
  "perPage": 2,
};

const REPLY = { identifiers: ["action_network:abc"], x: 1, _links: {} };

Deno.test("donation-list: sends GET with the mapped input", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  const out = await action.execute!(INPUT, ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(
    calls[0].url,
    "https://actionnetwork.org/api/v2/fundraising_pages/fundraisingpageid/donations?page=2&per_page=2&filter=modified_date+gt+%272026-01-01%27",
  );
  assertEquals(calls[0].body === null ? null : JSON.parse(calls[0].body), null);
  assertEquals(out, {
    "items": [],
    "hasMore": false,
  });
});

Deno.test("donation-list: sends no credential header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: REPLY }]);
  await action.execute!(INPUT, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
  assert(!("osdi-api-token" in calls[0].headers), "the sign hook injects credentials, not actions");
  assertEquals(calls[0].headers.accept, "application/hal+json, application/json");
});

Deno.test("donation-list: surfaces a vendor error and never echoes the key", async () => {
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

Deno.test("donation-list: declares its type, params and output", () => {
  assertEquals(action.key, "donation-list");
  assertEquals(action.resource, "donation");
  assertEquals(action.type, "search");
  assert(action.params!.length === 5);
  assertEquals(Array.isArray(action.output) ? action.output.length : 0, 6);
});
