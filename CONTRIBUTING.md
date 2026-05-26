# Contributing to SlopGuard

Thanks for helping make SlopGuard safer and more accurate.

## Development setup

```bash
npm install
npm run build
npm test
```

## Hotlist contribution flow

1. Fork and create a branch.
2. Add entries to [src/data/hotlist.json](src/data/hotlist.json).
3. Run `npm run hotlist:validate`.
4. Open a PR using the template.

### Hotlist entry requirements

Each entry must include:

- `name` package name
- `source` where you observed the hallucination or incident
- `confidence` number between 0 and 1
- `notes` short explanation

Example:

```json
{
  "name": "reacts",
  "source": "chat-llm-example",
  "confidence": 0.9,
  "notes": "Common typo of react"
}
```

### Source verification rules

- Provide a reproducible citation or screenshot reference in the PR.
- If the report is from an LLM session, include the model, prompt, and date.
- If the report is from a user report, include the report link or issue.

## Code contributions

- Keep changes minimal and deterministic.
- Avoid adding dependencies unless absolutely necessary.
- Prefer native Node APIs and keep performance predictable.

## Pull request checklist

- Tests pass
- Hotlist schema validation passes
- No additional dependencies introduced
