import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pull-request-create.ts";

const conn = { display: { baseUrl: "https://git.example.com", owner: "acme" } };

Deno.test("pull-request-create: POSTs head and base as given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { number: 4 } }], conn);
  await action.execute!({ repo: "web", title: "Ship it", head: "feature/x", base: "main" }, ctx);
  assertEquals(calls[0].url, "https://git.example.com/api/v1/repos/acme/web/pulls");
  assertEquals(JSON.parse(calls[0].body!), {
    title: "Ship it",
    head: "feature/x",
    base: "main",
  });
});

/** A fork's head is `owner:branch`, and the colon is meaningful. */
Deno.test("pull-request-create: a cross-repository head passes through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }], conn);
  await action.execute!({ repo: "web", title: "x", head: "fork-owner:feature", base: "main" }, ctx);
  assertEquals(JSON.parse(calls[0].body!).head, "fork-owner:feature");
});

/** Swapping them makes a real PR in the wrong direction, not an error. */
Deno.test("pull-request-create: both branches are required and must differ", async () => {
  const noHead = mockCtx([], conn);
  await assertRejects(
    async () => await action.execute!({ repo: "web", title: "x", base: "main" }, noHead.ctx),
    Error,
    "`head` is required",
  );
  const same = mockCtx([], conn);
  await assertRejects(
    async () =>
      await action.execute!({ repo: "web", title: "x", head: "main", base: "main" }, same.ctx),
    Error,
    "nothing to merge",
  );
  assertEquals(noHead.calls.length + same.calls.length, 0);
});

Deno.test("pull-request-create: the hints say which branch is which", () => {
  const params = action.params as Array<{ key: string; hint?: string }>;
  assert(params.find((p) => p.key === "head")!.hint!.includes("WITH the changes"));
  assert(params.find((p) => p.key === "base")!.hint!.includes("wrong way round"));
});
