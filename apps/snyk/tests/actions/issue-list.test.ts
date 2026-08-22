import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/issue-list.ts";
import { DEFAULT_VERSION } from "../../lib/client.ts";

const display = { orgId: "org-1" };

Deno.test("issue-list: uses the connection's org and stamps the version", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "i1" }], links: {} } }], {
    display,
  });
  const result = await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/rest/orgs/org-1/issues");
  assertEquals(url.searchParams.get("version"), DEFAULT_VERSION);
  assertEquals(result, [{ id: "i1" }]);
});

/** Snyk distinguishes inherent from effective severity; triage wants effective. */
Deno.test("issue-list: severities go as repeated effective_severity_level params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], links: {} } }], { display });
  await action.execute!({
    effectiveSeverityLevel: ["critical", "high"],
    status: ["open"],
    ignored: false,
  }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.getAll("effective_severity_level"), ["critical", "high"]);
  assertEquals(q.getAll("status"), ["open"]);
  // false is a real filter and must survive.
  assertEquals(q.get("ignored"), "false");
});

Deno.test("issue-list: the scan-item filter uses Snyk's dotted parameter names", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [], links: {} } }], { display });
  await action.execute!({ scanItemId: "p1", scanItemType: "project" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("scan_item.id"), "p1");
  assertEquals(q.get("scan_item.type"), "project");
});

Deno.test("issue-list: returnAll follows links.next", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { data: [{ id: "1" }], links: { next: "/rest/x?starting_after=c2" } } },
    { status: 200, body: { data: [{ id: "2" }], links: {} } },
  ], { display });
  assertEquals(await action.execute!({ returnAll: true }, ctx), [{ id: "1" }, { id: "2" }]);
  assertEquals(new URL(calls[1].url).searchParams.get("starting_after"), "c2");
});
