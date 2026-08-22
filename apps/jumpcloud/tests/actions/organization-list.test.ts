import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

const display = { display: { region: "us" } };

/**
 * This is how an MSP admin finds the id the connection's org field needs —
 * without it, every other call lands on the key's default organization.
 */
Deno.test("organization-list: reads the V1 organizations collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ _id: "org1", displayName: "Acme" }] },
  }], display);
  assertEquals(await action.execute!({}, ctx), [{ _id: "org1", displayName: "Acme" }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/organizations");
});

Deno.test("organization-list: works on any region", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], {
    display: { region: "in" },
  });
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).host, "console.in.jumpcloud.com");
  assert(action.description!.includes("org"), action.description);
});
