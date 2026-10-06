import type { ActionDefinition } from "@w6w/types";
import { call, compact, jsonArray, jsonObject } from "../lib/client.ts";

/**
 * `POST /api/commerce/updateCart` — verified 2026-10-06 against Iterable's Swagger document
 * (`https://api.iterable.com/api-docs`).
 */
const action: ActionDefinition = {
  key: "update-cart",
  type: "perform",
  resource: "commerce",
  title: "Update Shopping Cart",
  description: "Replace the `shoppingCartItems` on a user profile (creating the user when needed).",
  idempotent: true,
  params: [
    {
      key: "user",
      label: "User",
      type: "json",
      required: true,
      hint: 'User object, e.g. {"email": "a@b.co"}.',
    },
    {
      key: "items",
      label: "Items",
      type: "json",
      required: true,
      hint: "JSON array of commerce items.",
    },
  ],
  output: [
    { key: "code", type: "string", label: "Iterable result code (Success)" },
    { key: "msg", type: "string", label: "Iterable message" },
  ],

  async execute(input, ctx) {
    const p = input as Record<string, unknown>;
    const user = jsonObject("user", p.user);
    const items = jsonArray("items", p.items);
    if (user === undefined) throw new Error("`user` is required");
    if (items === undefined) throw new Error("`items` is required");
    ctx.log("info", "Iterable Update Shopping Cart");
    const out = await call(ctx, "POST", "/commerce/updateCart", {
      body: compact({ "user": user, "items": items }),
    });
    return out;
  },
};

export default action;
