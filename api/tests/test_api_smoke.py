"""
Smoke tests: app loads, OpenAPI, health, and key read-only API routes return JSON without 500.

Uses temp SQLite from conftest (same as test_auth_flow).
"""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client() -> TestClient:
    from api.main import app

    with TestClient(app) as c:
        yield c


def test_openapi_json(client: TestClient):
    r = client.get("/openapi.json")
    assert r.status_code == 200
    body = r.json()
    assert "paths" in body
    assert "/api/health" in body["paths"] or "/api/health" in str(body["paths"])


def test_public_read_routes_no_server_error(client: TestClient):
    """GET endpoints that should not require auth; must not return 500."""
    paths = [
        "/api/health",
        "/api/products",
        "/api/products/categories",
        "/api/meal-plans",
        "/api/nutritionists",
    ]
    for path in paths:
        r = client.get(path)
        assert r.status_code != 500, f"{path}: {r.text[:500]}"


def test_verify_returns_serializable_user(client: TestClient):
    """Register, login, /auth/verify returns valid + user object (not raw ORM)."""
    suffix = uuid.uuid4().hex[:10]
    username = f"smoke_{suffix}"
    email = f"{username}@example.com"
    password = "Smoke1ab"

    reg = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "name": "Smoke User",
            "role": "client",
        },
    )
    assert reg.status_code == 200, reg.text

    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert login.status_code == 200, login.text
    access = login.json()["access_token"]

    ver = client.get(
        "/api/auth/verify",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert ver.status_code == 200, ver.text
    data = ver.json()
    assert data.get("valid") is True
    user = data.get("user") or {}
    assert user.get("username") == username or user.get("userName") == username
    assert "id" in user
