import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { loadWorkspace, resolveWorkspace } from "../../lib/workspaces.ts";

const workspaceDocument = {
  status: 200,
  body: {
    data: {
      type: "workspaces",
      id: "ws-abc123",
      attributes: { name: "prod", "auto-apply": false, "resource-count": 12 },
    },
  },
};

/** An id from an earlier action should not need a lookup to reuse. */
Deno.test("resolveWorkspace: an id is used as given, with no request at all", async () => {
  const { ctx, calls } = mockCtx([]);
  assertEquals(await resolveWorkspace({ workspaceId: "ws-abc123" }, ctx), { id: "ws-abc123" });
  assertEquals(calls.length, 0);
});

/** A name is unique only within its organisation. */
Deno.test("resolveWorkspace: a name is looked up under its organisation", async () => {
  const { ctx, calls } = mockCtx([workspaceDocument]);
  const ref = await resolveWorkspace({ organization: "acme", workspace: "prod" }, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/organizations/acme/workspaces/prod");
  assertEquals(ref.id, "ws-abc123");
  assert(ref.workspace, "the record is kept so it is not fetched twice");
});

Deno.test("resolveWorkspace: an id in the wrong shape says how to use a name instead", async () => {
  const { ctx, calls } = mockCtx([]);
  let message = "";
  try {
    await resolveWorkspace({ workspaceId: "prod" }, ctx);
  } catch (err) {
    message = String(err);
  }
  assert(/should look like "ws-/.test(message), message);
  assert(/`organization` and `workspace`/.test(message), message);
  assertEquals(calls.length, 0);
});

Deno.test("resolveWorkspace: a name without an organisation is refused, and says why", async () => {
  for (const input of [{}, { organization: "acme" }, { workspace: "prod" }]) {
    const { ctx, calls } = mockCtx([]);
    let message = "";
    try {
      await resolveWorkspace(input, ctx);
    } catch (err) {
      message = String(err);
    }
    assert(/only unique within its organisation/.test(message), message);
    assertEquals(calls.length, 0);
  }
});

/** Resolving by name already fetched it; asking again is a wasted request. */
Deno.test("loadWorkspace: reuses the record resolving by name already returned", async () => {
  const named = mockCtx([workspaceDocument]);
  const ref = await resolveWorkspace({ organization: "acme", workspace: "prod" }, named.ctx);
  const workspace = await loadWorkspace(ref, named.ctx);
  assertEquals(named.calls.length, 1);
  assertEquals(workspace["name"], "prod");
});

Deno.test("loadWorkspace: fetches by id when only an id was given", async () => {
  const { ctx, calls } = mockCtx([workspaceDocument]);
  const workspace = await loadWorkspace({ id: "ws-abc123" }, ctx);
  assertEquals(calls[0].url, "https://app.terraform.io/api/v2/workspaces/ws-abc123");
  assertEquals(workspace["resource-count"], 12);
});
