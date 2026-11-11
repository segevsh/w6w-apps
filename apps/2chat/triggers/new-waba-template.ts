import type { ActionDefinition } from "@w6w/types";
import { arrayAt, idField, snapshotTrigger } from "../lib/triggers.ts";
import wabaTemplatesList from "../actions/waba-templates-list.ts";

export default snapshotTrigger<{ phoneNumber: string }>({
  key: "new-waba-template",
  title: "New WABA Template",
  description: "The run gets each new WhatsApp Business API message template of a WABA number.",
  action: wabaTemplatesList as unknown as ActionDefinition,
  input: (p) => ({ phoneNumber: p.phoneNumber, page: 0, limit: 200 }),
  pick: (result) => arrayAt(result, "templates"),
  idOf: idField("uuid"),
  params: [{
    key: "phoneNumber",
    label: "WABA number",
    type: "string",
    required: true,
    hint: "E.164, with the leading +.",
  }],
  output: [
    { key: "uuid", type: "string", label: "Template UUID" },
    { key: "name", type: "string", label: "Template name" },
    { key: "status", type: "string", label: "Approval status" },
    { key: "category", type: "string", label: "Category" },
  ],
  sample: {
    uuid: "TPL1",
    name: "order_update",
    status: "APPROVED",
    category: "UTILITY",
  },
});
