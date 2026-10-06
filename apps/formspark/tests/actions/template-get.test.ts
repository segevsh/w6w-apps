import { assertEquals } from "@std/assert";
import templateGet from "../../actions/template-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("template-get: GET /forms/{id}/templates/{kind}", async () => {
  const tpl = { kind: "autoresponder", mode: "code", code: "<p>hi</p>", paused: false };
  const { ctx, calls } = mockCtx([{ body: tpl }]);
  const out = await templateGet.execute({ formId: "f1", kind: "autoresponder" }, ctx);
  assertEquals(pathOf(calls[0].url), "/public/v1/forms/f1/templates/autoresponder");
  assertEquals(out, tpl);
});

Deno.test("template-get: kind offers exactly notification and autoresponder", () => {
  const kind = templateGet.params!.find((p) => p.key === "kind")!;
  assertEquals(
    (kind.options as Array<{ value: string }>).map((o) => o.value),
    ["notification", "autoresponder"],
  );
});
