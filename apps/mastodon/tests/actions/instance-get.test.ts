import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, ok } from "./_shared.ts";
import action from "../../actions/instance-get.ts";

const instance = ok({
  domain: "mastodon.social",
  version: "4.7.0",
  registrations: { enabled: true },
  rules: [{ id: "1", text: "No bots without a label" }],
  configuration: { statuses: { max_characters: 500, max_media_attachments: 4 } },
});

Deno.test("instance-get: reads v2 and lifts out the limits every action respects", async () => {
  const { ctx, calls } = mockCtx([instance], { display });
  const result = await action.execute!({}, ctx) as {
    maxCharacters: number;
    maxMedia: number;
    version: string;
    registrations: boolean;
  };
  assertEquals(calls[0].url, "https://mastodon.social/api/v2/instance");
  assertEquals(result.maxCharacters, 500);
  assertEquals(result.maxMedia, 4);
  assertEquals(result.version, "4.7.0");
  assertEquals(result.registrations, true);
});

/** The rules usually say something about automated posting. */
Deno.test("instance-get: returns the server's rules", async () => {
  const { ctx } = mockCtx([instance], { display });
  const result = await action.execute!({}, ctx) as { rules: Array<{ text: string }> };
  assertEquals(result.rules.length, 1);
  assert(/No bots/.test(result.rules[0].text), result.rules[0].text);
});

Deno.test("instance-get: a server with no rules is an empty list, not undefined", async () => {
  const { ctx } = mockCtx([ok({ domain: "x.social" })], { display });
  const result = await action.execute!({}, ctx) as { rules: unknown[]; registrations: boolean };
  assertEquals(result.rules, []);
  assertEquals(result.registrations, false);
});

Deno.test("instance-get: takes no parameters", () => {
  assertEquals(action.params?.length ?? 0, 0);
});

/** v1 is deprecated and shaped differently, so the doc comment says to use v2. */
Deno.test("instance-get: says the limits are what other actions respect", () => {
  assert(/every other\s+action respects/.test(action.description!), action.description);
  assert(/automated posting/.test(action.description!), action.description);
});
