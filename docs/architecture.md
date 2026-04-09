# Architecture Notes

## V1 Direction
Framework Architect is intentionally local-first and architecture-first. The app captures a project idea as a governed blueprint and keeps governance concepts explicit instead of burying them in helper code.

## Top-Level Blueprint Contract
The blueprint document contains:
- project
- intent
- outcomes
- actors
- constraints
- domains
- functions
- components
- flows
- dependencies
- rules
- invariants
- decision_logic
- failure_modes
- guardrails
- phases
- mvp_scope
- expansion_scope
- validation
- memory

## Memory Layers
V1 includes three persistent memory layers:
- Project memory: raw idea, intended outcome, philosophy, constraints, invariant priorities
- Structural memory: domains, functions, components, dependencies, rules, guardrails, validation snapshots
- Decision memory: change reasons, rejected options, invariant conflicts, scope decisions

## Validation Rules
The validation engine enforces:
- every function maps to at least one outcome
- every component maps to at least one function
- every dependency references valid entities
- every rule has a scope
- every invariant is global or clearly scoped
- every MVP item is distinct from expansion scope
- build-ready status is blocked by critical validation failures

## Persistence Strategy
The app uses a repository interface with a localStorage adapter. That keeps persistence replaceable so a future database layer can be added without rewriting domain, schema, or validation code.
