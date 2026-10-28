import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, one } from "./_shared.ts";
import action from "../../actions/work-item-create.ts";

const created = one({ id: 101, url: "https://dev.azure.com/…/101" });

/**
 * The only part of the API that takes a JSON Patch document, sent as
 * application/json-patch+json.
 */
Deno.test("work-item-create: builds a patch document with the right content type", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({ project: "P", type: "Bug", title: "Fix login" }, ctx);
  assertEquals(
    calls[0].url.split("?")[0],
    "https://dev.azure.com/contoso/P/_apis/wit/workitems/$Bug",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json-patch+json");
  assertEquals(JSON.parse(calls[0].body!), [
    { op: "add", path: "/fields/System.Title", value: "Fix login" },
  ]);
});

Deno.test("work-item-create: short names are qualified and extra fields pass through", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  await action.execute!({
    project: "P",
    type: "Bug",
    title: "Fix login",
    assignedTo: "ada@contoso.com",
    fields: '{"Microsoft.VSTS.Common.Priority":1,"Custom.TeamArea":"Platform"}',
  }, ctx);
  const patch = JSON.parse(calls[0].body!) as Array<{ path: string; value: unknown }>;
  const paths = patch.map((op) => op.path);
  assert(paths.includes("/fields/System.AssignedTo"), paths.join(","));
  assert(paths.includes("/fields/Microsoft.VSTS.Common.Priority"), paths.join(","));
  assert(paths.includes("/fields/Custom.TeamArea"), paths.join(","));
});

/** A dry run for values that came from outside. */
Deno.test("work-item-create: validateOnly creates nothing and says so", async () => {
  const { ctx, calls } = mockCtx([created], { display });
  const result = await action.execute!({
    project: "P",
    type: "Bug",
    title: "x",
    validateOnly: true,
  }, ctx) as { validatedOnly: boolean };
  assertEquals(new URL(calls[0].url).searchParams.get("validateOnly"), "true");
  assertEquals(result.validatedOnly, true);
});

Deno.test("work-item-create: every required field is checked before the request", async () => {
  const base = { project: "P", type: "Bug", title: "x" };
  for (const missing of ["project", "type", "title"]) {
    const { ctx, calls } = mockCtx([], { display });
    await assertRejects(
      async () => await action.execute!({ ...base, [missing]: "" }, ctx),
      Error,
      missing,
    );
    assertEquals(calls.length, 0);
  }
});

Deno.test("work-item-create: logs the id and type, not the field values", async () => {
  const { ctx, logs } = mockCtx([created], { display });
  await action.execute!({ project: "P", type: "Bug", title: "confidential summary" }, ctx);
  assert(!JSON.stringify(logs).includes("confidential"), JSON.stringify(logs));
  assertEquals(logs[0].data, { workItemId: 101, type: "Bug" });
});

/** Agile has User Story; Scrum has Product Backlog Item. */
Deno.test("work-item-create: warns that types depend on the process", () => {
  const p = (action.params as Array<{ key: string; hint?: string }>).find((p) => p.key === "type")!;
  assert(/Product Backlog Item/.test(p.hint!), p.hint);
});
