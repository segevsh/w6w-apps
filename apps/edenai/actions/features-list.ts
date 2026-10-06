import type { ActionDefinition } from "@w6w/types";
import { EdenClient } from "../lib/client.ts";

/**
 * `GET /v3/info` and `GET /v3/info/{feature}`.
 *
 * PUBLIC routes (200 with no key). The catalog is ~94 KB without schemas, so the action returns
 * the compact form: per subfeature, its mode and the provider ids that serve it.
 */
interface Input {
  feature?: string;
}

interface Subfeature {
  name?: string;
  fullname?: string;
  description?: string | null;
  mode?: string;
  models?: Array<{ model?: string }>;
}

interface Feature {
  name?: string;
  subfeatures?: Subfeature[];
}

const featuresList: ActionDefinition<Input> = {
  key: "features-list",
  type: "read",
  resource: "universal-ai",
  title: "List Expert-Model Features",
  description:
    "List the Universal AI features (text, ocr, image, translation, audio, web, video), their subfeatures, whether each is sync or async, and the models that serve them.",
  params: [
    {
      key: "feature",
      label: "Feature",
      type: "string",
      hint: "Optional: limit to one feature, e.g. ocr.",
    },
  ],
  output: [
    {
      key: "subfeatures",
      type: "array",
      label: "Subfeatures (feature, subfeature, title, mode, models)",
    },
    { key: "count", type: "number", label: "Subfeatures returned" },
  ],

  async execute(input, ctx) {
    const client = new EdenClient(ctx);
    const feature = input.feature?.trim();
    const features: Feature[] = feature
      ? [await client.json<Feature>(`/info/${encodeURIComponent(feature)}`)]
      : (await client.json<{ features?: Feature[] }>("/info")).features ?? [];
    const subfeatures = features.flatMap((f) =>
      (f.subfeatures ?? []).map((s) => ({
        feature: f.name,
        subfeature: s.name,
        title: s.fullname,
        description: s.description ?? undefined,
        mode: s.mode,
        models: (s.models ?? []).map((m) => m.model),
      }))
    );
    return { subfeatures, count: subfeatures.length };
  },
};

export default featuresList;
