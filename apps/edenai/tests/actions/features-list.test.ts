import { assertEquals } from "@std/assert";
import featuresList from "../../actions/features-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const sub = (name: string, mode: string) => ({
  name,
  fullname: name.toUpperCase(),
  description: null,
  mode,
  models: [{ model: `ocr/${name}/amazon`, pricing: { price: 1 } }],
});

Deno.test("features-list: flattens every feature's subfeatures with their model ids", async () => {
  const { ctx, calls } = mockCtx([{
    body: {
      features: [{ name: "ocr", subfeatures: [sub("ocr", "sync"), sub("ocr_async", "async")] }, {
        name: "text",
        subfeatures: [sub("moderation", "sync")],
      }],
    },
  }]);
  const out = await featuresList.execute({}, ctx) as {
    subfeatures: Array<Record<string, unknown>>;
    count: number;
  };

  assertEquals(pathOf(calls[0].url), "/v3/info");
  assertEquals(out.count, 3);
  assertEquals(out.subfeatures[1].feature, "ocr");
  assertEquals(out.subfeatures[1].mode, "async");
  assertEquals(out.subfeatures[1].models, ["ocr/ocr_async/amazon"]);
});

Deno.test("features-list: a feature filter reads the single-feature route", async () => {
  const { ctx, calls } = mockCtx([{ body: { name: "ocr", subfeatures: [sub("ocr", "sync")] } }]);
  const out = await featuresList.execute({ feature: "ocr" }, ctx) as { count: number };
  assertEquals(pathOf(calls[0].url), "/v3/info/ocr");
  assertEquals(out.count, 1);
});
