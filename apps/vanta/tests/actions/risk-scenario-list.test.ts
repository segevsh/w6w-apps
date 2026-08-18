import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { display, page } from "./_shared.ts";
import action from "../../actions/risk-scenario-list.ts";

/** Vanta returns only one type per call and defaults to risk scenarios. */
Deno.test("risk-scenario-list: sends the type explicitly", async () => {
  const { ctx, calls } = mockCtx([page([{ id: "r1" }])], { display });
  await action.execute!({}, ctx);
  assertEquals(calls[0].url.split("?")[0], "https://api.vanta.com/v1/risk-scenarios");
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "Risk Scenario");
});

Deno.test("risk-scenario-list: enterprise risks are a separate call", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ type: "Enterprise Risk" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "Enterprise Risk");
});

/** Vanta takes the literal strings "No owner" and "Uncategorized" as filters. */
Deno.test("risk-scenario-list: the literal owner and category sentinels pass through", async () => {
  const { ctx, calls } = mockCtx([page([])], { display });
  await action.execute!({ owners: "No owner", categories: "Uncategorized" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("ownerMatchesAny"), ["No owner"]);
  assertEquals(q.getAll("categoryMatchesAny"), ["Uncategorized"]);
});

Deno.test("risk-scenario-list: says why a register can look short", () => {
  assert(/unless asked for/.test(action.description!), action.description);
});
