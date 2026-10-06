import type { ActionDefinition } from "@w6w/types";
import { call, compact, int, jsonArray, jsonObject, num, str } from "../lib/client.ts";

/**
 * `POST /api/commerce/trackPurchase` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "track-purchase",
  type: "perform",
  resource: "commerce",
  title: "Track Purchase",
  description:
    "Record a purchase. Clears the user's shopping cart and creates or updates the user profile from `user`.",
  idempotent: false,
  params: [
    {
      key: "user",
      label: "User",
      type: "json",
      required: true,
      hint: 'User object, e.g. {"email": "a@b.co", "dataFields": {}}.',
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint:
        'JSON array of commerce items: {"id", "name", "price", "quantity", ...} (id, name, price, quantity required by Iterable).',
    },
    { key: "total", label: "Total", type: "number", required: true, hint: "Purchase total." },
    { key: "id", label: "Purchase ID", type: "string" },
    { key: "createdAt", label: "Created At", type: "number", hint: "Unix timestamp in seconds." },
    { key: "campaignId", label: "Campaign ID", type: "number" },
    { key: "templateId", label: "Template ID", type: "number" },
    { key: "dataFields", label: "Data Fields", type: "json", hint: "Extra purchase data." },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const user = jsonObject("user", p.user);
    const items = jsonArray("items", p.items);
    const total = num("total", p.total);
    const id = str(p.id);
    const createdAt = int("createdAt", p.createdAt);
    const campaignId = int("campaignId", p.campaignId);
    const templateId = int("templateId", p.templateId);
    const dataFields = jsonObject("dataFields", p.dataFields);
    if (user === undefined) throw new Error("`user` is required");
    if (items === undefined) throw new Error("`items` is required");
    if (total === undefined) throw new Error("`total` is required");
    ctx.log("info", "Iterable Track Purchase");
    const out = await call(ctx, "POST", "/commerce/trackPurchase", {
      body: compact({
        "user": user,
        "items": items,
        "total": total,
        "id": id,
        "createdAt": createdAt,
        "campaignId": campaignId,
        "templateId": templateId,
        "dataFields": dataFields,
      }),
    });
    return out;
  },
};

export default action;
