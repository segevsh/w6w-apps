import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/work-item-update.ts";

const updated = one({ id: 101, rev: 4 });

Deno.test("work-item-update: PATCHes a patch document with the right content type", async () => {
  const { ctx, calls } = mockCtx([updated], { display });
  await action.execute!({ project: "P", workItemId: "101", state: "Resolved" }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/wit/workitems/101",
  );
  assertEquals(calls[0].method, "PATCH");
  assertEquals(calls[0].headers["content-type"], "application/json-patch+json");
  assertEquals(JSON.parse(calls[0].body!), [
    { op: "add", path: "/fields/System.State", value: "Resolved" },
  ]);
});

/** Setting History appends a comment rather than overwriting. */
Deno.test("work-item-update: a comment goes through System.History", async () => {
  const { ctx, calls } = mockCtx([updated], { display });
  await action.execute!({
    project: "P",
    workItemId: "101",
    state: "Resolved",
    history: "Fixed by pipeline run 99.",
  }, ctx);
  const patch = JSON.parse(calls[0].body!) as Array<{ path: string }>;
  assert(patch.some((op) => op.path === "/fields/System.History"), JSON.stringify(patch));
});

Deno.test("work-item-update: an empty update is refused rather than sent", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P", workItemId: "101" }, ctx),
    Error,
    "nothing to update",
  );
  assertEquals(calls.length, 0);
});

Deno.test("work-item-update: needs a project and an id", async () => {
  const { ctx } = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ project: "P", title: "x" }, ctx),
    Error,
    "workItemId",
  );
});

/** The values may be anything; the field names are the useful, safe half. */
Deno.test("work-item-update: logs which fields changed, not their values", async () => {
  const { ctx, logs } = mockCtx([updated], { display });
  await action.execute!({
    project: "P",
    workItemId: "101",
    title: "confidential summary",
    state: "Active",
  }, ctx);
  assert(!JSON.stringify(logs).includes("confidential"), JSON.stringify(logs));
  assertEquals(logs[0].data, { workItemId: "101", changed: ["System.Title", "System.State"] });
});

/** Skipping the process rules from an automation is how a board goes wrong. */
Deno.test("work-item-update: deliberately offers no bypassRules", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assert(!keys.includes("bypassRules"), keys.join(","));
});
