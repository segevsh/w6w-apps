import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/shape-create.ts";

Deno.test("shape-create: builds createShape with the type and page", async () => {
  const { ctx, calls } = mockCtx([{ body: { replies: [{ createShape: { objectId: "s1" } }] } }]);
  await action.execute({ presentationId: "p1", pageObjectId: "g1", shapeType: "TEXT_BOX" }, ctx);

  assertEquals(new URL(calls[0].url).pathname, "/v1/presentations/p1:batchUpdate");
  assertEquals(JSON.parse(calls[0].body!), {
    requests: [{
      createShape: { shapeType: "TEXT_BOX", elementProperties: { pageObjectId: "g1" } },
    }],
  });
});

Deno.test("shape-create: matches Google's own sample shape for a placed text box", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({
    presentationId: "p1",
    pageObjectId: "pageId",
    shapeType: "TEXT_BOX",
    objectId: "MyTextBox_01",
    width: 350,
    height: 350,
    translateX: 350,
    translateY: 100,
    unit: "PT",
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!).requests[0].createShape, {
    shapeType: "TEXT_BOX",
    objectId: "MyTextBox_01",
    elementProperties: {
      pageObjectId: "pageId",
      size: { width: { magnitude: 350, unit: "PT" }, height: { magnitude: 350, unit: "PT" } },
      transform: { scaleX: 1, scaleY: 1, translateX: 350, translateY: 100, unit: "PT" },
    },
  });
});

Deno.test("shape-create: accepts a shape type outside the curated dropdown", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute(
    { presentationId: "p1", pageObjectId: "g1", shapeType: "FLOW_CHART_MAGNETIC_DRUM" },
    ctx,
  );
  assertEquals(
    JSON.parse(calls[0].body!).requests[0].createShape.shapeType,
    "FLOW_CHART_MAGNETIC_DRUM",
  );
});

Deno.test("shape-create: never offers TYPE_UNSPECIFIED or CUSTOM", () => {
  const shapeType = (action.params ?? []).find((p) => p.key === "shapeType");
  const values = (shapeType?.options as Array<{ value: string }>).map((o) => o.value);
  assertEquals(values.includes("TYPE_UNSPECIFIED"), false);
  assertEquals(values.includes("CUSTOM"), false);
  assertEquals(shapeType?.default, "TEXT_BOX");
});
