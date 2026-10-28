import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/page-create.ts";

const display = { site: "acme" };

Deno.test("page-create: POSTs the body as a {representation, value} object", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "1" } }], { display });
  await action.execute!({ spaceId: "101", title: "Runbook", body: "<p>hi</p>" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/wiki/api/v2/pages");
  assertEquals(JSON.parse(calls[0].body!), {
    spaceId: "101",
    status: "current",
    title: "Runbook",
    body: { representation: "storage", value: "<p>hi</p>" },
  });
});

Deno.test("page-create: root-level is only sent when asked for", async () => {
  const under = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ spaceId: "101", title: "T", parentId: "9" }, under.ctx);
  assertEquals(new URL(under.calls[0].url).searchParams.get("root-level"), null);
  assertEquals(JSON.parse(under.calls[0].body!).parentId, "9");

  const root = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ spaceId: "101", title: "T", rootLevel: true }, root.ctx);
  assertEquals(new URL(root.calls[0].url).searchParams.get("root-level"), "true");
});

Deno.test("page-create: a parent and root-level together is Confluence's own contradiction", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(
    async () =>
      await action.execute!({ spaceId: "1", title: "T", parentId: "9", rootLevel: true }, ctx),
    Error,
    "mutually exclusive",
  );
  assertEquals(calls.length, 0);
});

Deno.test("page-create: a title is required unless the page is a draft", async () => {
  const published = mockCtx([], { display });
  await assertRejects(
    async () => await action.execute!({ spaceId: "101" }, published.ctx),
    Error,
    "`title` is required",
  );
  assertEquals(published.calls.length, 0);

  const draft = mockCtx([{ status: 200, body: {} }], { display });
  await action.execute!({ spaceId: "101", status: "draft" }, draft.ctx);
  assertEquals(JSON.parse(draft.calls[0].body!).title, undefined);
});
