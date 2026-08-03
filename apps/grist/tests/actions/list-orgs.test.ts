import { assertEquals } from "@std/assert";
import { actionCtx } from "../_helpers.ts";
import listOrgs from "../../actions/list-orgs.ts";

Deno.test("list-orgs: GETs /orgs with no parameters at all", async () => {
  const { ctx, calls } = actionCtx([{ body: [] }]);
  await listOrgs.execute!({}, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(new URL(calls[0].url).pathname, "/api/orgs");
  assertEquals(new URL(calls[0].url).search, "");
  assertEquals(listOrgs.params, []);
});

Deno.test("list-orgs: returns the BARE array Grist sends, not an envelope", async () => {
  const { ctx } = actionCtx([{
    body: [
      { id: 42, name: "Grist Labs", domain: "gristlabs", access: "owners" },
      { id: 7, name: "Personal", domain: null, access: "owners" },
    ],
  }]);
  const out = await listOrgs.execute!({}, ctx);
  assertEquals(Array.isArray(out), true);
  assertEquals(out.map((o) => o.domain), ["gristlabs", null]);
});
