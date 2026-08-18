import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/envelope-find.ts";

const conn = { display: {} };

/** Templates are envelopes too, so an unfiltered list includes them. */
Deno.test("envelope-find: defaults to documents, not the mixed collection", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [{ id: "e1" }] } }], conn);
  assertEquals(await action.execute!({}, ctx), [{ id: "e1" }]);
  assertEquals(new URL(calls[0].url).searchParams.get("type"), "DOCUMENT");
});

Deno.test("envelope-find: templates and the mixed view are both reachable", async () => {
  const templates = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ type: "TEMPLATE" }, templates.ctx);
  assertEquals(new URL(templates.calls[0].url).searchParams.get("type"), "TEMPLATE");

  const both = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ type: "" }, both.ctx);
  assertEquals(new URL(both.calls[0].url).searchParams.get("type"), null);
});

Deno.test("envelope-find: status, search and folder filters reach the wire", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }], conn);
  await action.execute!({ status: "PENDING", query: "nda", folderId: "f1" }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("status"), "PENDING");
  assertEquals(q.get("query"), "nda");
  assertEquals(q.get("folderId"), "f1");
  const param = (action.params as Array<{ key: string; hint?: string }>)
    .find((p) => p.key === "type")!;
  assert(param.hint!.includes("templates appear alongside"), param.hint);
});
