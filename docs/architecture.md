# Architecture Notes

## Product Shape
The system takes a messy idea and turns it into a versioned framework package with memory, critique, and export.

## V1 Priorities
1. Intake a rough idea.
2. Produce structured framework JSON.
3. Save each result as a versioned artifact.
4. Track memory and revision history in SQLite.
5. Surface critique and weak points before expansion.

## Deliberate Non-Goals
- No vector database in v1.
- No multi-model routing in v1.
- No heavy frontend framework until the backend contract is stable.
- No autonomous orchestration layer before the structured output format is reliable.

## Planned Modules
- `api`: FastAPI routes and request/response boundaries
- `core`: framework assembly and critique orchestration
- `db`: SQLite connection and persistence concerns
- `llm`: single-provider, structured-output integration
- `memory`: artifact history, refinement state, and retrieval
- `schemas`: Pydantic models for inputs, outputs, and stored records
