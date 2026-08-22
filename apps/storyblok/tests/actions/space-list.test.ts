import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-list.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const spaces = {
  status: 200,
  body: {
    spaces: [
      { id: 123, name: "Marketing site", plan: "growth", region: "eu" },
      { id: 456, name: "Old prototype", plan: "starter", region: "eu" },
    ],
  },
};

/** A personal access token defaults to every space its owner has. */
Deno.test("space-list: reports the blast radius and warns when it is wide", async () => {
  const { ctx, calls, logs } = mockCtx([spaces], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces");
  assertEquals(result.count, 2);
  assertEquals(result.connectedSpaceId, "123");
  assert(
    logs.some((l) => /defaults to every space its owner has/.test(l.message)),
    JSON.stringify(logs),
  );
});

/** The plan decides whether the API allows 3 or 6 requests a second. */
Deno.test("space-list: derives the rate limit from the connected space's plan", async () => {
  const growth = mockCtx([spaces], M);
  const onGrowth = await action.execute({}, growth.ctx) as Record<string, unknown>;
  assertEquals(onGrowth.rateLimitPerSecond, 6);

  const starter = mockCtx([spaces], {
    display: { credentialKind: "management", region: "eu", spaceId: "456" },
  });
  const onStarter = await action.execute({}, starter.ctx) as Record<string, unknown>;
  assertEquals(onStarter.rateLimitPerSecond, 3);
});

Deno.test("space-list: maps each space to its plan", async () => {
  const { ctx } = mockCtx([spaces], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.plans, { "Marketing site": "growth", "Old prototype": "starter" });
});

Deno.test("space-list: one space warns about nothing", async () => {
  const { ctx, logs } = mockCtx([{ status: 200, body: { spaces: [spaces.body.spaces[0]] } }], M);
  await action.execute({}, ctx);
  assertEquals(logs.length, 0);
});

Deno.test("space-list: takes no parameters and only reads", () => {
  assertEquals(action.params, []);
  assertEquals(action.type, "search");
});
