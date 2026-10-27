# Jev

Evaluate state against typed questions with TypeSafe's System One (Jev).

- **Categories** — ai
- **Auth methods** — api-key (Bearer)
- **Actions** — 2 (`list-models`, `evaluate`)
- **Egress allowlist** — `api.typesafe.ai`
- **Model provider** — `llm`

Base URL `https://api.typesafe.ai/v1`. `list-models` calls `GET /models`; `evaluate` calls
`POST /systemone` with `{ model, state, questions }`.

## Health check

`service` probes `GET /models` unauthenticated: any HTTP answer below 500 is `ok`, 5xx is
`down`, a network failure is `unknown`. TypeSafe publishes no status feed or rate-limit headers,
so there is no `quota` check.

## Notes

`assets/icon.svg` is a placeholder, not the TypeSafe brand mark.
