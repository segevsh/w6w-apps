import type { Param } from "@w6w/types";
import { boundedList } from "../lib/triggers.ts";
import propertyReviewsList from "../actions/property-reviews-list.ts";

const PROPERTY_ID: Param = {
  key: "propertyId",
  label: "Property UUID",
  type: "string",
  required: true,
  hint: "The property to watch (from List Properties).",
};

export default boundedList({
  key: "new-property-review",
  title: "New Property Review",
  description: "The run gets each guest review newly posted for one property.",
  action: propertyReviewsList as never,
  paged: true,
  params: [PROPERTY_ID],
  input: (params) => ({ uuid: String(params.propertyId).trim() }),
  output: [
    { key: "id", type: "string", label: "Review ID" },
    { key: "public", type: "object", label: "Public review" },
    { key: "private", type: "object", label: "Private feedback" },
  ],
  sample: { id: "review-1", public: { rating: 5, review: "Lovely stay" } },
});
