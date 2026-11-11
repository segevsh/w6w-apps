import { snapshotTrigger } from "../lib/triggers.ts";
import pricingPlanList from "../actions/pricing-plan-list.ts";

interface PricingPlan {
  id?: number;
  name?: string;
}

// Teachable: GET /v1/pricing_plans has no sort or filter, only `page`/`per` with
// `meta.number_of_pages` (https://docs.teachable.com/reference/listpricingplans, verified
// 2026-11-10). A school has a handful of plans, so every check reads all pages and diffs the ids
// (snapshot, brief 9.1 c); the first check seeds and emits nothing.
export default snapshotTrigger<PricingPlan>({
  key: "new-pricing-plan",
  title: "New Pricing Plan",
  description: "The run gets each pricing plan newly added to the school.",
  async fetchPage(page, ctx) {
    const res = await pricingPlanList.execute({ page, per: 5 }, ctx) as {
      pricing_plans?: PricingPlan[];
      meta?: { number_of_pages?: number };
    };
    return { items: res.pricing_plans ?? [], pages: res.meta?.number_of_pages };
  },
  idOf: (p) => String(p.id ?? ""),
  output: [
    { key: "id", type: "number", label: "Pricing plan ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "price", type: "number", label: "Price (minor units)" },
    { key: "currency", type: "string", label: "Currency" },
    { key: "course_id", type: "number", label: "Course ID" },
    { key: "created_at", type: "string", label: "Created at" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],
  sample: {
    id: 3,
    name: "Monthly",
    price: 4900,
    currency: "USD",
    course_id: 12,
    created_at: "2026-11-09T00:00:00.000Z",
    updated_at: "2026-11-09T00:00:00.000Z",
  },
});
