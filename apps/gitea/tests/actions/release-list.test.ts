import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-list.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

/** Drafts and prereleases are included unless filtered out. */
Deno.test("release-list: includes everything by default", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: 1 }] }], conn);
  await action.execute!({ repo: "web" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("draft"), null);
  assertEquals(q.get("pre-release"), null);
});

Deno.test("release-list: the filters use Gitea's hyphenated parameter name", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [] }], conn);
  await action.execute!({ repo: "web", draft: "false", preRelease: "false" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("draft"), "false");
  assertEquals(q.get("pre-release"), "false");
});

Deno.test("release-list: the draft hint warns about the newest being unpublished", () => {
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "draft")!;
  assert(param.hint!.includes("unpublished draft"), param.hint);
});
