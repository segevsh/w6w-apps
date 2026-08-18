import type { ActionDefinition } from "@w6w/types";
import { DocumensoClient, json } from "../lib/client.ts";
import { ENVELOPE_PARAM } from "../lib/params.ts";

/**
 * `POST /envelope/field/create-many` — verified against Documenso's v2 OpenAPI
 * document (required `envelopeId` and `data`).
 *
 * A field is where somebody signs, dates or types — and **it is positioned in
 * percentages of the page**, not pixels: `pageX`, `pageY`, `width` and `height`
 * are all 0–100. A field placed with pixel coordinates lands somewhere absurd
 * rather than failing.
 *
 * Every field belongs to a **recipient**, by their numeric id. A signature
 * field with nobody attached is not a field anyone can fill.
 */
const action: ActionDefinition = {
  key: "envelope-field-add",
  type: "perform",
  resource: "field",
  title: "Add fields",
  description: "Place signature and input fields on a draft envelope's pages.",
  idempotent: false,
  params: [
    ENVELOPE_PARAM,
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      default: "",
      placeholder: '[{"recipientId":12,"type":"SIGNATURE","envelopeItemId":"…","pageNumber":1,' +
        '"pageX":10,"pageY":80,"width":25,"height":8}]',
      hint: "Positions are PERCENTAGES of the page (0–100), not pixels. Each field names the " +
        "recipient who fills it.",
    },
  ],
  output: [
    { key: "fields", type: "array", label: "The fields as created, with their ids" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const envelopeId = String(p.envelopeId ?? "").trim();
    if (!envelopeId) throw new Error("`envelopeId` is required");

    const data = json(p.fields, "fields");
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("`fields` is required — a non-empty array of field objects");
    }
    for (const [i, raw] of data.entries()) {
      const f = raw as Record<string, unknown>;
      if (f?.recipientId === undefined || f.recipientId === null) {
        throw new Error(`field ${i} has no \`recipientId\` — a field nobody owns cannot be filled`);
      }
      // Percentages, not pixels — a page-sized number here is the tell.
      for (const key of ["pageX", "pageY", "width", "height"] as const) {
        const value = f[key];
        if (typeof value === "number" && (value < 0 || value > 100)) {
          throw new Error(
            `field ${i} has \`${key}\` of ${value} — positions are percentages of the page ` +
              "(0–100), not pixels",
          );
        }
      }
    }

    ctx.log("info", "adding Documenso fields", { envelopeId, fields: data.length });

    return await new DocumensoClient(ctx).request("/envelope/field/create-many", {
      method: "POST",
      body: { envelopeId, data },
    });
  },
};

export default action;
