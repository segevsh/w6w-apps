import { createAction } from "../lib/factory.ts";

export default createAction({
  key: "opportunity-create",
  title: "Create Opportunity",
  noun: "Opportunity",
  type: "opportunity",
  path: "opportunities",
  description: "Create an opportunity, optionally tied to an account, owner and stage.",
  attrParams: [
    { key: "name", label: "Name", type: "string" },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      validation: { integer: true, min: 0 },
      hint: "Whole currency units.",
    },
    { key: "closeDate", label: "Close date", type: "datetime" },
    { key: "description", label: "Description", type: "text" },
    { key: "nextStep", label: "Next step", type: "string" },
    {
      key: "probability",
      label: "Probability (%)",
      type: "number",
      validation: { integer: true, min: 0, max: 100 },
    },
  ],
  relParams: [
    { param: "accountId", rel: "account", type: "account" },
    { param: "ownerId", rel: "owner", type: "user" },
    { param: "opportunityStageId", rel: "opportunityStage", type: "opportunityStage" },
  ],
  relFieldParams: [
    {
      key: "accountId",
      label: "Account ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "ownerId",
      label: "Owner (user) ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "opportunityStageId",
      label: "Opportunity stage ID",
      type: "number",
      validation: { integer: true, min: 1 },
    },
  ],
});
