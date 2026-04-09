# Framework Architect

Framework Architect is a TypeScript web app that turns a raw project idea into a governed project blueprint before implementation begins.

## Core Purpose
The app accepts a rough idea, extracts the intended outcome, and stores a structured project blueprint with explicit governance:
- intended outcome
- domains
- required functions
- components
- dependencies
- rules
- invariants
- guardrails
- phases
- MVP scope
- expansion scope

## V1 Includes
- Strong TypeScript domain types and Zod schemas
- Local-first persistence for projects, blueprint data, and memory
- Validation rules for structural governance checks
- Minimal UI for project creation, intent/outcome editing, blueprint viewing, memory viewing, and validation review
- A seed example blueprint for inspection and iteration

## Architecture Layers
- `schema`: Zod contracts for every entity and the top-level blueprint
- `domain`: shared types, defaults, and entity metadata
- `application`: intake, validation, and persistence workflows
- `persistence`: repository interface and localStorage adapter
- `ui`: minimal React components and workspace flow

## Local Setup
```bash
npm install
npm run dev
```

## Verification
```bash
npm run build
npm run test
```

## Notes
- The app is deliberately local-first and transparent.
- Validation logic lives outside the UI.
- AI orchestration and code generation are intentionally out of scope for this version.
