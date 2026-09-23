#!/usr/bin/env bash
set -e

echo "Running Ruff formatting check..."
ruff format --check backend/

echo "Running Ruff lint check..."
ruff check backend/

echo "Running Mypy type check..."
mypy backend/app

echo "Running Pytest test suite..."
cd backend
pytest tests/ -v
cd ..
