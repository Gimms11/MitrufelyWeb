"""
Mifrufely Web — Settings Parser Unit Tests
Tests custom validators in config.py
"""

import pytest
from app.core.config import Settings


def test_parse_list_from_string_json_array() -> None:
    # Test JSON array parsing (used in .env files for lists)
    value = '["http://localhost:3000","http://localhost:5173"]'
    parsed = Settings.parse_list_from_string(value)
    assert parsed == ["http://localhost:3000", "http://localhost:5173"]


def test_parse_list_from_string_csv() -> None:
    # Test fallback comma-separated string parsing
    value = "http://localhost:3000, http://localhost:5173"
    parsed = Settings.parse_list_from_string(value)
    assert parsed == ["http://localhost:3000", "http://localhost:5173"]


def test_parse_list_from_string_already_list() -> None:
    # Test when input is already a list
    value = ["http://localhost:3000", "http://localhost:5173"]
    parsed = Settings.parse_list_from_string(value)
    assert parsed == ["http://localhost:3000", "http://localhost:5173"]


def test_parse_list_from_string_nested_list() -> None:
    # Test flattening of nested lists
    value = [["http://localhost:3000"], "http://localhost:5173"]
    parsed = Settings.parse_list_from_string(value)
    assert parsed == ["http://localhost:3000", "http://localhost:5173"]
