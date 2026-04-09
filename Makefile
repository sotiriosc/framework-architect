PYTHON := .venv/bin/python
PIP := .venv/bin/pip

.PHONY: install dev test lint

install:
	python3 -m venv .venv
	$(PYTHON) -m pip install --upgrade pip
	$(PIP) install -e ".[dev]"

dev:
	$(PYTHON) -m uvicorn framework_forge.api.app:app --reload

test:
	$(PYTHON) -m pytest

lint:
	$(PYTHON) -m ruff check .
