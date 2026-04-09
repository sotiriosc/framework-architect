PYTHON := .venv/bin/python

.PHONY: install dev test lint

install:
	python3 -m venv .venv
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -e ".[dev]"

dev:
	$(PYTHON) -m uvicorn framework_architect.api.app:app --reload

test:
	$(PYTHON) -m pytest

lint:
	$(PYTHON) -m ruff check .
