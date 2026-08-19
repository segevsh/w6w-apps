import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/component-list.ts";

const M = { display: { credentialKind: "management", region: "eu", spaceId: "123" } };
const D = { display: { credentialKind: "delivery", region: "eu" } };
const components = {
  status: 200,
  body: {
    components: [
      {
        id: 1,
        name: "page",
        is_root: true,
        schema: { title: { type: "text", required: true }, body: { type: "bloks" } },
      },
      {
        id: 2,
        name: "hero",
        is_root: false,
        is_nestable: true,
        schema: { headline: { type: "text" } },
      },
    ],
  },
};

/** This is what story-create has to satisfy. */
Deno.test("component-list: separates content types from nestable blocks", async () => {
  const { ctx, calls } = mockCtx([components], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(new URL(calls[0].url).pathname, "/v1/spaces/123/components");
  assertEquals(result.contentTypes, ["page"]);
  assertEquals(result.nestable, ["hero"]);
});

Deno.test("component-list: maps each component to its field names", async () => {
  const { ctx } = mockCtx([components], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.fieldsByComponent, { page: ["title", "body"], hero: ["headline"] });
});

/** Required is a convention for the editor, not an API constraint. */
Deno.test("component-list: reports required fields, which the API does not enforce", async () => {
  const { ctx } = mockCtx([components], M);
  const result = await action.execute({}, ctx) as Record<string, unknown>;
  assertEquals(result.requiredFields, { page: ["title"] });
  assert(/not enforced by the API/.test(
    (action.output as Array<{ key: string; label: string }>)
      .find((o) => o.key === "requiredFields")!.label,
  ));
});

Deno.test("component-list: rootOnly and name filters apply here", async () => {
  const { ctx } = mockCtx([components], M);
  const result = await action.execute({ rootOnly: true }, ctx) as Record<string, unknown>;
  assertEquals(result.count, 1);

  const named = mockCtx([components], M);
  const filtered = await action.execute({ nameContains: "HERO" }, named.ctx) as Record<
    string,
    unknown
  >;
  assertEquals(filtered.names, ["hero"]);
});

Deno.test("component-list: refuses a delivery connection", async () => {
  const { ctx, calls } = mockCtx([], D);
  await assertRejects(async () => await action.execute({}, ctx), Error, "MANAGEMENT connection");
  assertEquals(calls.length, 0);
});

/** Unknown fields are stored and never rendered. */
Deno.test("component-list: says Storyblok stores unknown fields silently", () => {
  assert(/UNKNOWN FIELDS silently/.test(action.description!), action.description);
});
