"""
Auth primitives built entirely on the Python standard library.

Why not bcrypt / PyJWT? Those pull in native extensions / extra
dependencies that can fail to install in some environments. Since BugSnap
now runs on local SQLite with no external auth provider, we implement:

  - Password hashing: PBKDF2-HMAC-SHA256 (via hashlib, stdlib) with a
    random salt per user.
  - Tokens: a small HMAC-signed, base64url JSON blob (same idea as a JWT,
    self-contained, verifiable, and expiring) using hmac + hashlib + json.

Both are cryptographically reasonable for a hackathon-grade product and
have zero third-party dependency risk.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any

SECRET_KEY = os.getenv("APP_SECRET_KEY", "bugsnap-dev-secret-change-me-in-production")
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 7)))  # 7 days

PBKDF2_ITERATIONS = 200_000


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algo, iterations, salt, hex_digest = stored_hash.split("$")
        iterations = int(iterations)
    except (ValueError, AttributeError):
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return hmac.compare_digest(dk.hex(), hex_digest)


# ---------------------------------------------------------------------------
# Signed tokens (JWT-shaped, stdlib-only)
# ---------------------------------------------------------------------------

def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_token(payload: dict[str, Any]) -> str:
    body = dict(payload)
    body["exp"] = int(time.time()) + TOKEN_TTL_SECONDS
    body["iat"] = int(time.time())

    header_b64 = _b64url_encode(json.dumps({"alg": "HS256", "typ": "BUGSNAP"}).encode())
    payload_b64 = _b64url_encode(json.dumps(body).encode())
    signing_input = f"{header_b64}.{payload_b64}".encode()
    signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    signature_b64 = _b64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{signature_b64}"


class InvalidToken(Exception):
    pass


def verify_token(token: str) -> dict[str, Any]:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        raise InvalidToken("Malformed token")

    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected_sig = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    actual_sig = _b64url_decode(signature_b64)

    if not hmac.compare_digest(expected_sig, actual_sig):
        raise InvalidToken("Signature mismatch")

    payload = json.loads(_b64url_decode(payload_b64))

    if payload.get("exp", 0) < time.time():
        raise InvalidToken("Token expired")

    return payload
