import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import getIdentity from "../../actions/get-identity.ts";

Deno.test("get-identity: splits the scope claim into a list", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      active: true,
      scope: "record_permission:read-write object_configuration:read task:read",
      workspace_id: "w1",
      workspace_name: "Acme",
      workspace_slug: "acme",
      authorized_by_workspace_member_id: "m1",
      exp: null,
    },
  }]);
  const out = await run<{ scopes: string[]; workspace_name: string; expires_at: number | null }>(
    getIdentity,
    {},
    ctx,
  );
  assertEquals(calls[0].url, "https://api.attio.com/v2/self");
  assertEquals(out.scopes, [
    "record_permission:read-write",
    "object_configuration:read",
    "task:read",
  ]);
  assertEquals(out.workspace_name, "Acme");
  assertEquals(out.expires_at, null);
});

/**
 * Verified on the wire, 2026-08-03: a 64-character random token gets
 * `HTTP 200 {"active":false}`. Anything that trusts `res.ok` here is broken.
 */
Deno.test("get-identity: throws on the 200 `{active:false}` arm rather than returning nulls", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { active: false } }]);
  let threw = false;
  try {
    await getIdentity.execute({}, ctx);
  } catch (e) {
    threw = true;
    assert((e as Error).message.includes("inactive"), (e as Error).message);
    assert((e as Error).message.includes("HTTP 200"), (e as Error).message);
  }
  assert(threw, "an inactive token must not look like a successful identify");
});

Deno.test('get-identity: an empty scope string yields an empty list, not [""]', async () => {
  const { ctx } = mockCtx([{ status: 200, body: { active: true, scope: "" } }]);
  const out = await run<{ scopes: string[] }>(getIdentity, {}, ctx);
  assertEquals(out.scopes, []);
});
