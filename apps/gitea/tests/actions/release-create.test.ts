import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/release-create.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("release-create: POSTs the tag and both flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: 1 } }], conn);
  await action.execute!({ repo: "web", tagName: "v1.4.0", name: "1.4.0" }, ctx);
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/releases");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.tag_name, "v1.4.0");
  // Both are meaningful when false and must reach the wire.
  assertEquals(body.draft, false);
  assertEquals(body.prerelease, false);
});

/** Blank targets the default branch's tip at call time, not what was tested. */
Deno.test("release-create: the target is sent when named", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ repo: "web", tagName: "v1", targetCommitish: "abc123" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).target_commitish, "abc123");

  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "targetCommitish")!;
  assert(param.hint!.includes("AT CALL TIME"), param.hint);
});

Deno.test("release-create: a tag is required, before any request", async () => {
  const { ctx, calls } = mockCtx([], conn);
  await assertRejects(async () => await action.execute!({ repo: "web" }, ctx), Error, "`tagName`");
  assertEquals(calls.length, 0);
  assertEquals(action.idempotent, false);
});
