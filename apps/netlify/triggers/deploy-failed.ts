import { webhookTrigger } from "../lib/triggers.ts";

/** A deploy that did not complete (`state: error`). */
const deployFailed = webhookTrigger({
  key: "deploy-failed",
  title: "Deploy Failed",
  description:
    "Fires when a Netlify deploy fails (point the Deploy failed notification at it). The run gets the deploy, the error message, branch and commit.",
  states: ["error"],
});

export default deployFailed;
