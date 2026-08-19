import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/space-get.ts";

const D = { display: { credentialKind: "delivery", region: "eu" } };
const M = { display: { credentialKind: "management", region: "eu", spaceId: "1" } };

/** The space's `version` is the cache version under another name. */
Deno.test("space-get: returns the space's version as the cache version", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      space: {
        id: 123,
        name: "Marketing site",
        domain: "https://example.com",
        version: 1735645795,
        language_codes: ["de", "fr"],
      },
    },
  }], D);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(calls[0].url, "https://api.storyblok.com/v2/cdn/spaces/me");
  assertEquals(result.cacheVersion, 1735645795);
  assertEquals(result.languageCodes, ["de", "fr"]);
});

Deno.test("space-get: refuses a management connection", async () => {
  const { ctx, calls } = mockCtx([], M);
  await assertRejects(async () => await action.execute({}, ctx), Error, "CONTENT DELIVERY API");
  assertEquals(calls.length, 0);
});

Deno.test("space-get: an empty response is an error rather than an empty result", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "no space");
});

Deno.test("space-get: says this is the first call of a run", () => {
  assert(/first call of a run/.test(action.description!), action.description);
  assertEquals(action.params, []);
});
