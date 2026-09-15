import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-update-metadata.ts";

Deno.test("organization-update-metadata: PATCHes the dedicated /metadata endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "org_1" } }]);
  await action.execute!({ organizationId: "org_1", privateMetadata: '{"tier":"gold"}' }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1/organizations/org_1/metadata");
  assertEquals(JSON.parse(calls[0].body!), { private_metadata: { tier: "gold" } });
});
