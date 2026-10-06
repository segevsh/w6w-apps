import type { ActionDefinition } from "@w6w/types";
import { encodeId, RegfoxClient } from "../lib/client.ts";
import { requiredId } from "../lib/params.ts";

/** `GET /v2/public/coupons/forms/{formId}` — note `forms`, plural, in the path. */
const couponListForm: ActionDefinition<Record<string, unknown>> = {
  key: "coupon-list-form",
  type: "search",
  resource: "coupon",
  title: "List Form Coupons",
  description: "List the coupons associated with one registration form.",
  params: [requiredId("formId", "Form ID")],
  output: [{ key: "coupons", type: "array", label: "Coupons" }],
  async execute(input, ctx) {
    const body = await new RegfoxClient(ctx).call<unknown[]>(
      `/coupons/forms/${encodeId(input.formId)}`,
    );
    return { coupons: body.data ?? [] };
  },
};

export default couponListForm;
