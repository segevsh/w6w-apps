import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/control-list.ts";

/** The most common finding in a readiness review. */
Deno.test("control-list: separates the controls nobody owns", async () => {
  const { ctx, calls } = mockCtx([page([
    { id: "c1", name: "Access reviewed quarterly", owner: { id: "u1" } },
    { id: "c2", name: "Backups tested", owner: null },
    { id: "c3", name: "Encryption at rest" },
  ])], { display });
  const result = await action.execute!({}, ctx) as { count: number; unowned: string[] };
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/controls");
  assertEquals(result.count, 3);
  assertEquals(result.unowned, ["Backups tested", "Encryption at rest"]);
});

Deno.test("control-list: the framework filter is sent as repeated keys", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ frameworks: "soc2, iso27001" }, ctx);
  assertEquals(
    new URL(calls[0].url).searchParams.getAll("frameworkMatchesAny"),
    ["soc2", "iso27001"],
  );
});

Deno.test("control-list: distinguishes a control from a test", () => {
  assert(/requirements a framework imposes/.test(action.description!), action.description);
});
