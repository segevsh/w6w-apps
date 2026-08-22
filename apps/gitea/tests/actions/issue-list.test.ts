import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-list.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** An unfiltered issue list silently contains pull requests. */
Deno.test("issue-list: defaults to issues only, not Gitea's mixed default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ number: 1 }] }], conn);
  await action.execute!({ repo: "web" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "issues");
  assertEquals(new URL(calls[0].url).searchParams.get("state"), "open");
});

Deno.test("issue-list: the mixed default is available, explicitly", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ repo: "web", type: "" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), null);
});

/** Reading filters by label NAME while writing takes ids — the asymmetry. */
Deno.test("issue-list: labels filter by name here, comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ repo: "web", labels: "bug, urgent", q: "crash" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("labels"), "bug,urgent");
  assertEquals(q.get("q"), "crash");
});

Deno.test("issue-list: the type option names the trap", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "type")!;
  assert(param.hint!.includes("pull requests alongside issues"), param.hint);
});
