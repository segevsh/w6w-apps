import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/command-result-list.ts";

const display = { display: { region: "us" } };

/** This is where a command's outcome lives; command-run only returns queue ids. */
Deno.test("command-result-list: reads the commandresults collection", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { results: [{ _id: "r1", exitCode: 0 }] },
  }], display);
  assertEquals(await action.execute!({}, ctx), [{ _id: "r1", exitCode: 0 }]);
  assertEquals(new URL(calls[0].url).pathname, "/api/commandresults");
});

Deno.test("command-result-list: the filter narrows to one command's run", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { results: [] } }], display);
  await action.execute!({ filter: "workflowId:$eq:c1" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("filter"), "workflowId:$eq:c1");
});

/** The filter param is declared once, not twice, despite reusing the shared set. */
Deno.test("command-result-list: has exactly one filter param", () => {
  const keys = (action.params as Array<{ key: string }>).map((p) => p.key);
  assertEquals(keys.filter((k) => k === "filter").length, 1);
  assert(keys.includes("sort") && keys.includes("fields"));
});
