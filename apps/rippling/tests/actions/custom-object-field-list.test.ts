import { assertEquals, assertRejects } from "@std/assert";
import { API_ROOT, listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import customObjectFieldList from "../../actions/custom-object-field-list.ts";

Deno.test("custom-object-field-list: GETs /custom-objects/<api>/fields/ and lifts the cursor", async () => {
  const next = `${API_ROOT}/custom-objects/asset/fields/?cursor=c2&limit=1`;
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([{ api_name: "tag" }], next) }]);
  const out = await customObjectFieldList.execute(
    { customObjectApiName: "asset", limit: 1 },
    ctx,
  ) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/custom-objects/asset/fields/");
  assertEquals(queryOf(calls[0].url), { limit: "1" });
  assertEquals(out.results, [{ api_name: "tag" }]);
  assertEquals(out.nextCursor, "c2");
});

Deno.test("custom-object-field-list: requires the object api name and encodes it", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listBody([]) }]);
  await assertRejects(
    () =>
      Promise.resolve().then(() =>
        customObjectFieldList.execute({ customObjectApiName: " " }, ctx)
      ),
    Error,
    "customObjectApiName is required",
  );
  await customObjectFieldList.execute({ customObjectApiName: "a/b" }, ctx);
  assertEquals(pathOf(calls[0].url), "/custom-objects/a%2Fb/fields/");
});
