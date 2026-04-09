# Framework Architect

Framework Architect does not generate code first.
It generates the full functional architecture required to fulfill a project idea before implementation begins.

## Core Purpose
The app takes a raw idea and produces a governed structure that a builder can actually build from:
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

## Core Principle
Do not let the model be the framework.
Make the model produce the framework.

## V1 Stack
- Backend: Python + FastAPI
- Schemas: Pydantic
- Storage: SQLite first
- Memory: plain relational tables first, vector search later
- LLM layer: one model, structured JSON output only
- Interface: simple web UI or CLI after the architecture engine is stable

## Repo Layout
```text
framework-architect/
├── docs/
├── src/framework_architect/
│   ├── api/
│   ├── core/
│   ├── db/
│   ├── llm/
│   ├── memory/
│   └── schemas/
├── tests/
├── .env.example
├── Makefile
└── pyproject.toml
```

## Local Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e ".[dev]"
```

## Initial Commands
```bash
make install
make dev
make test
```

## Status
The project is scaffolded and dependencies are installed. Implementation logic is still intentionally deferred while the architecture contract is being defined.
