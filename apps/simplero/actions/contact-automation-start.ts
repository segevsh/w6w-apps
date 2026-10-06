import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  automationId: number;
}

export default contactAction<Input>({
  key: "contact-automation-start",
  title: "Start Automation for Contact",
  description:
    "Start an automation for a contact. The automation must run on contacts (object type `Customer`).",
  action: "start_automation",
  idempotent: false,
  params: [
    contactIdParam,
    refParam(
      "automationId",
      "Automation ID",
      "The automation to start, e.g. from List Automations.",
    ),
  ],
  body: (i) => ({ automation_id: i.automationId }),
});
