import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/collection-get.ts";

const D = { display: { region: "us" } };

Deno.test("collection-get: GETs the collection by id", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      object: "collection",
      id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
      externalId: "ext-1",
      groups: [{ id: "a1b2c3d4-e5f6-4789-8abc-def012345678", readOnly: true }],
    },
  }], D);
  const result = await action.execute(
    { collectionId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b" },
    ctx,
  ) as Record<string, unknown>;
  assertEquals(
    calls[0].url,
    "https://api.bitwarden.com/public/collections/3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
  );
  assertEquals(result.externalId, "ext-1");
  assertEquals((result.groups as unknown[]).length, 1);
});

Deno.test("collection-get: rejects an id that is not a UUID before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({
      collectionId: "not-a-uuid",
      type: 2,
      name: "x",
      memberIds: "",
      groupIds: "",
      enabled: true,
    }, ctx)
  );
  assertMatch((err as Error).message, /must be a UUID/);
  assertEquals(calls.length, 0);
});
