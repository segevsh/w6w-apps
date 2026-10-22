import type { HealthCheckDefinition } from "@w6w/types";

/**
 * Ollama has no request quota, because it is the user's own server.
 */
const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Request headroom",
  kind: "quota",
  covers: ["*"],
  scope: "connection",
  severity: "informational",
  unavailable: {
    reason: "Ollama is software you run and imposes no API rate limit or usage quota — no " +
      "endpoint reports usage and no response carries rate-limit headers. What limits a server " +
      "is its hardware: concurrent requests queue behind the model (OLLAMA_NUM_PARALLEL and " +
      "OLLAMA_MAX_QUEUE set the ceiling, and a full queue answers 503), and GPU/RAM decides how " +
      "many models stay loaded (`model-running`). A reverse proxy in front may add its own " +
      "limits, which are not reported in-band.",
  },
};

export default quota;
