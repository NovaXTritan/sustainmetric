#!/usr/bin/env bash
# Render build script — runs in the repo root
set -o errexit

pip install --upgrade pip
pip install uv
cd apps/api
uv pip install --system .
