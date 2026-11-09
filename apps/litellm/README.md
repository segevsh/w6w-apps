# LiteLLM

Reach 15 model vendors — Gemini, Groq, OpenRouter, Together and more — through the LiteLLM proxy
built into W6W.

- **Categories** — ai
- **Auth methods** — api-key (vendor + that vendor's key)
- **Actions** — none: the connection is used by the host's model layer (routes, Functions, agents)
- **Egress allowlist** — none: the host reaches the proxy on loopback, the proxy reaches the vendor
- **Model provider** — `llm`

Models are named `<vendor>/<model>` (`gemini/gemini-2.5-flash`, `groq/llama-3.3-70b-versatile`).
The host refuses a model whose prefix is not the connection's own vendor, so a key only ever goes
to the vendor that issued it.

The proxy runs inside the API container (`W6W_LITELLM=embedded`, on by default); see the server's
`docs/` "LiteLLM models" page. The vendor list must match the server's
`packages/server/litellm/config.yaml` — `tests/auth/api-key.test.ts` checks it when the server
checkout sits beside this one.

## Notes

`assets/icon.svg` is a generic placeholder, not the LiteLLM brand mark.
