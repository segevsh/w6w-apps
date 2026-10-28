import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-chart-image.ts";

Deno.test("get-chart-image: emits the full three-parameter image() form by default", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: "aGVsbG8=" } }]);
  const out = await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    chart: "Chart 1",
  }, ctx);

  // The reference's documented default behaviour.
  assertEquals(
    decodeURIComponent(new URL(calls[0].url).pathname),
    "/v1.0/me/drive/items/ITEM1/workbook/worksheets/Sheet1/charts/Chart 1" +
      "/image(width=0,height=0,fittingMode='Fit')",
  );
  assertEquals(out.value, "aGVsbG8=");
});

Deno.test("get-chart-image: encodes the chart name in the path segment", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: "x" } }]);
  await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", chart: "Chart 1" }, ctx);
  assert(new URL(calls[0].url).pathname.includes("/charts/Chart%201/"), calls[0].url);
});

Deno.test("get-chart-image: passes width, height and fitting mode through", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: "x" } }]);
  await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    chart: "Chart 1",
    width: 500,
    height: 500,
    fittingMode: "Fill",
  }, ctx);
  assert(
    decodeURIComponent(new URL(calls[0].url).pathname)
      .endsWith("/image(width=500,height=500,fittingMode='Fill')"),
    calls[0].url,
  );
});

Deno.test("get-chart-image: assembles a data URI locally, with no extra request", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: "aGVsbG8=" } }]);
  const out = await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    chart: "Chart 1",
  }, ctx);
  assertEquals(out.dataUri, "data:image/png;base64,aGVsbG8=");
  assertEquals(calls.length, 1);
});

Deno.test("get-chart-image: leaves the data URI undefined when Graph returns no image", async () => {
  const { ctx } = mockCtx([{ body: {} }]);
  const out = await action.execute({
    itemId: "ITEM1",
    worksheet: "Sheet1",
    chart: "Chart 1",
  }, ctx);
  assertEquals(out.value, undefined);
  assertEquals(out.dataUri, undefined);
});

Deno.test("get-chart-image: works under the path form and forwards the session", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: "x" } }]);
  await action.execute({
    itemPath: "Reports/Q3.xlsx",
    worksheet: "Sheet1",
    chart: "Chart 1",
    sessionId: "s1",
  }, ctx);
  assert(
    new URL(calls[0].url).pathname.startsWith("/v1.0/me/drive/root:/Reports/Q3.xlsx:/workbook/"),
    calls[0].url,
  );
  assertEquals(calls[0].headers["workbook-session-id"], "s1");
});

Deno.test("get-chart-image: refuses an empty chart identifier", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(
    async () => await action.execute({ itemId: "ITEM1", worksheet: "Sheet1", chart: " " }, ctx),
    Error,
    "empty",
  );
});
