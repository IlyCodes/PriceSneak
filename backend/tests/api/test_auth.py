import pytest


def test_register_user(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "test@pricesneak.com",
            "name": "Test User",
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@pricesneak.com"
    assert "id" in data
    # Sécurité : vérifier que le mot de passe n'est jamais fuité dans la réponse !
    assert "password_hash" not in data


def test_register_user_duplicate_email(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@pricesneak.com",
            "name": "Test User",
            "password": "password123",
        },
    )
    response = client.post(
        "/api/auth/register",
        json={
            "email": "duplicate@pricesneak.com",
            "name": "Test User 2",
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Un utilisateur avec cet email existe déjà."


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "login@pricesneak.com",
            "name": "Login User",
            "password": "password123",
        },
    )
    # L'authentification OAuth2 exige un formulaire 'data' (x-www-form-urlencoded), pas du JSON
    response = client.post(
        "/api/auth/login",
        data={"username": "login@pricesneak.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert response.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post(
        "/api/auth/register",
        json={
            "email": "login2@pricesneak.com",
            "name": "Login User 2",
            "password": "password123",
        },
    )
    response = client.post(
        "/api/auth/login",
        data={"username": "login2@pricesneak.com", "password": "wrongpassword"},
    )
    assert response.status_code == 401


def test_get_current_user(client):
    client.post(
        "/api/auth/register",
        json={"email": "me@pricesneak.com", "name": "Me", "password": "password123"},
    )
    login_response = client.post(
        "/api/auth/login",
        data={"username": "me@pricesneak.com", "password": "password123"},
    )
    token = login_response.json()["access_token"]

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["email"] == "me@pricesneak.com"


def test_invalid_validation_password_too_short(client):
    response = client.post(
        "/api/auth/register",
        json={
            "email": "short@pricesneak.com",
            "name": "Short",
            "password": "123",
        },  # < 6 caractères
    )
    assert response.status_code == 422
