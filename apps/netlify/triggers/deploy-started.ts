import { webhookTrigger } from "../lib/triggers.ts";

/** A deploy that Netlify has started building (`state: building`). */
const deployStarted = webhookTrigger({
  key: "deploy-started",
  title: "Deploy Started",
  description:
    "Fires when Netlify starts building a deploy (point the Deploy started notification at it). The run gets the deploy, branch, commit and site.",
  states: ["building"],
});

export default deployStarted;
