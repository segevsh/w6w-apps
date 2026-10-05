import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-import.ts";

const D = { display: { region: "us" } };

Deno.test("organization-import: POSTs members/groups with overwriteExisting always present", async () => {
  const { ctx, calls } = mockCtx([{ body: { statusCode: 200 } }], D);
  const result = await action.execute({
    members: '[{"externalId":"u1","email":"a@x.io"}]',
    groups: [{ name: "Eng", externalId: "g1", memberExternalIds: ["u1"] }],
  }, ctx) as Record<string, unknown>;
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, "https://api.bitwarden.com/public/organization/import");
  assertEquals(JSON.parse(calls[0].body!).overwriteExisting, false);
  assertEquals(result, { statusCode: 200, memberCount: 1, groupCount: 1 });
});

Deno.test("organization-import: requires an email unless the member is deleted", async () => {
  const { ctx } = mockCtx([], D);
  const err = await assertRejects(async () =>
    await action.execute({ members: [{ externalId: "u1" }] }, ctx)
  );
  assertMatch((err as Error).message, /email.*unless/);
});

Deno.test("organization-import: allows a deleted member without an email", async () => {
  const { ctx, calls } = mockCtx([{ body: { statusCode: 200 } }], D);
  await action.execute(
    { members: [{ externalId: "u1", deleted: true }], overwriteExisting: true },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).overwriteExisting, true);
});
