import { contactAction } from "../lib/factory.ts";
import { contactIdParam, refParam } from "../lib/params.ts";

interface Input {
  id: number;
  automationId: number;
}

export default contactAction<Input>({
  key: "contact-automation-stop",
  title: "Stop Automation for Contact",
  description: "Stop an automation that is running for a contact.",
  action: "stop_automation",
  idempotent: false,
  params: [contactIdParam, refParam("automationId", "Automation ID", "The automation to stop.")],
  body: (i) => ({ automation_id: i.automationId }),
});
