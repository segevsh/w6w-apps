import { assert, assertEquals } from "@std/assert";
import { mockCtx, run } from "../_helpers.ts";
import listWorkspaceMembers from "../../actions/list-workspace-members.ts";

Deno.test("list-workspace-members: GETs /v2/workspace_members with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ email_address: "a@x.com" }] } }]);
  const out = await run<{ records: unknown[] }>(listWorkspaceMembers, {}, ctx);
  // Underscore, not a hyphen or camelCase — the one thing to get wrong here.
  assertEquals(calls[0].url, "https://api.attio.com/v2/workspace_members");
  assertEquals(out.records, [{ email_address: "a@x.com" }]);
  assertEquals(listWorkspaceMembers.params, []);
});

/** Members are seats, person records are contacts. Conflating them is the classic bug. */
Deno.test("list-workspace-members: distinguishes seats from person records", () => {
  assert(/seats, not person records/i.test(listWorkspaceMembers.description!));
});
