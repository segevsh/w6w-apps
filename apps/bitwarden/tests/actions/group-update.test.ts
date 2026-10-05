import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/group-update.ts";

const D = { display: { region: "us" } };

Deno.test("group-update: PUTs to the group id", async () => {
  const { ctx, calls } = mockCtx([{
    body: { object: "group", id: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b", name: "Eng 2" },
  }], D);
  await action.execute({
    groupId: "3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
    name: "Eng 2",
    collections: [{ id: "a1b2c3d4-e5f6-4789-8abc-def012345678", readOnly: true, manage: true }],
  }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(
    calls[0].url,
    "https://api.bitwarden.com/public/groups/3f2b8c1e-5a4d-4e6f-9a1b-7c8d9e0f1a2b",
  );
  assertEquals(JSON.parse(calls[0].body!).collections, [{
    id: "a1b2c3d4-e5f6-4789-8abc-def012345678",
    readOnly: true,
    manage: true,
  }]);
});

Deno.test("group-update: rejects an id that is not a UUID before any request", async () => {
  const { ctx, calls } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({
      groupId: "not-a-uuid",
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
