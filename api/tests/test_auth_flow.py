"""
Auth integration tests: register, login, /me, refresh, negative paths.

Requires: pytest (runs in-process with TestClient; uses temp SQLite from conftest).

Run from repo root:
  pytest api/tests/test_auth_flow.py -v
"""
from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="module")
def client() -> TestClient:
    """Single app instance; lifespan runs once (creates tables + optional seed)."""
    from api.main import app

    with TestClient(app) as c:
        yield c


def _unique_user(prefix: str = "tuser") -> tuple[str, str, str]:
    suffix = uuid.uuid4().hex[:10]
    username = f"{prefix}_{suffix}"
    email = f"{username}@example.com"
    password = "Pytest1a"  # letter + digit, 8+ chars (UserRegister rules)
    return username, email, password


def test_health_includes_db_ping(client: TestClient):
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body.get("status") == "running"
    db = body.get("database") or {}
    assert db.get("ping_ok") is True, db.get("ping_error")


def test_register_login_me_refresh_verify(client: TestClient):
    username, email, password = _unique_user()

    reg = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "name": "Pytest User",
            "role": "client",
        },
    )
    assert reg.status_code == 200, reg.text
    reg_js = reg.json()
    assert "access_token" in reg_js and "refresh_token" in reg_js
    u = reg_js.get("user") or {}
    assert u.get("username") == username or u.get("userName") == username
    assert u.get("email") == email
    assert "id" in u

    login = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    assert login.status_code == 200, login.text
    tokens = login.json()
    assert tokens.get("token_type") == "bearer"
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    access = tokens["access_token"]
    refresh = tokens["refresh_token"]

    me = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert me.status_code == 200, me.text
    me_js = me.json()
    assert me_js["username"] == username
    assert me_js["email"] == email

    ver = client.get(
        "/api/auth/verify",
        headers={"Authorization": f"Bearer {access}"},
    )
    assert ver.status_code == 200
    assert ver.json().get("valid") is True

    new_tokens = client.post(
        "/api/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert new_tokens.status_code == 200, new_tokens.text
    nt = new_tokens.json()
    assert "access_token" in nt
    assert "refresh_token" in nt

    me2 = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {nt['access_token']}"},
    )
    assert me2.status_code == 200


def test_login_invalid_password(client: TestClient):
    username, email, password = _unique_user("badpwd")

    reg = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "name": "Bad User",
            "role": "client",
        },
    )
    assert reg.status_code == 200

    bad = client.post(
        "/api/auth/login",
        json={"username": username, "password": "Wrongpass1"},
    )
    assert bad.status_code == 401
    assert "detail" in bad.json()


def test_register_duplicate_username(client: TestClient):
    username, email, password = _unique_user("dup")

    r1 = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": email,
            "password": password,
            "name": "First",
            "role": "client",
        },
    )
    assert r1.status_code == 200

    r2 = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": f"other_{uuid.uuid4().hex[:8]}@example.com",
            "password": password,
            "name": "Second",
            "role": "client",
        },
    )
    assert r2.status_code == 400
    assert "already" in str(r2.json().get("detail", "")).lower()


def test_register_validation_weak_password(client: TestClient):
    username, _, _ = _unique_user("weak")
    r = client.post(
        "/api/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "onlyletters",  # no digit
            "name": "Y",
            "role": "client",
        },
    )
    assert r.status_code == 422

