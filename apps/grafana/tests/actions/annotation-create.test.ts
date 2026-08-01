import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/annotation-create.ts";

const display = { endpoint: "https://example.grafana.net" };

Deno.test("annotation-create: POSTs /annotations with text and scoping fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, message: "Annotation added" } }], { display });
  const result = await action.execute(
    {
      text: "Deploy v2",
      dashboardUid: "cIBgcSjkk",
      panelId: 4,
      time: 1507037197339,
      tags: "deploy, prod",
    },
    ctx,
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/api/annotations");
  assertEquals(JSON.parse(calls[0].body!), {
    text: "Deploy v2",
    dashboardUID: "cIBgcSjkk",
    panelId: 4,
    time: 1507037197339,
    tags: ["deploy", "prod"],
  });
  assertEquals(result, { id: 1, message: "Annotation added" });
});

Deno.test("annotation-create: omits tags entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], { display });
  await action.execute({ text: "Global note" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("tags" in body && body.tags !== undefined, false);
});
