import { webhookTrigger } from "../lib/triggers.ts";

/** A deploy that finished and is live (`state: ready`). */
const deploySucceeded = webhookTrigger({
  key: "deploy-succeeded",
  title: "Deploy Succeeded",
  description:
    "Fires when a Netlify deploy succeeds (point the Deploy succeeded notification at it). The run gets the deploy, its URLs, branch and commit.",
  states: ["ready"],
});

export default deploySucceeded;
