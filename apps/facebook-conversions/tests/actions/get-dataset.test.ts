import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-dataset.ts";

Deno.test("get-dataset: GETs the dataset node with the default field list", async () => {
  const { ctx, calls } = mockCtx([
    { body: { id: "1234567890", name: "Storefront", last_fired_time: "2026-08-03T10:00:00+0000" } },
  ]);
  const result = await action.execute({}, ctx);

  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25.0/1234567890");
  assert(url.searchParams.get("fields")!.includes("last_fired_time"));
  assertEquals(result.name, "Storefront");
});

Deno.test("get-dataset: honours an explicit dataset id and field list", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "42" } }]);
  await action.execute({ datasetId: "42", fields: "id,name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v25.0/42");
  assertEquals(url.searchParams.get("fields"), "id,name");
});

Deno.test("get-dataset: reports the permission error verbatim", async () => {
  const { ctx } = mockCtx([
    {
      status: 403,
      body: { error: { message: "(#200) Requires ads_read permission", code: 200 } },
    },
  ]);
  await assertRejects(
    () => Promise.resolve(action.execute({}, ctx)),
    Error,
    "Requires ads_read permission",
  );
});

Deno.test("get-dataset: omits authorization (the runtime injects it)", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "1234567890" } }]);
  await action.execute({}, ctx);
  assert(!("authorization" in calls[0].headers));
});
