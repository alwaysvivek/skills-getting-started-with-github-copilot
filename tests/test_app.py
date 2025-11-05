import copy
import urllib.parse

import pytest
from fastapi.testclient import TestClient

from src import app as application


# Keep an original snapshot of the activities so tests can reset state.
_ORIG_ACTIVITIES = copy.deepcopy(application.activities)


@pytest.fixture(autouse=True)
def reset_activities():
    # Restore a fresh copy before each test to avoid cross-test pollution
    application.activities.clear()
    application.activities.update(copy.deepcopy(_ORIG_ACTIVITIES))
    yield


def test_get_activities_initial():
    client = TestClient(application.app)
    r = client.get("/activities")
    assert r.status_code == 200
    data = r.json()
    # Expect a mapping and some known activities
    assert isinstance(data, dict)
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]


def test_signup_adds_participant():
    client = TestClient(application.app)
    activity = "Chess Club"
    email = "test.user@example.com"

    # Sign up
    path = f"/activities/{urllib.parse.quote(activity)}/signup?email={urllib.parse.quote(email)}"
    r = client.post(path)
    assert r.status_code == 200
    assert "Signed up" in r.json().get("message", "")

    # Verify participant present in GET /activities
    r2 = client.get("/activities")
    assert r2.status_code == 200
    participants = r2.json()[activity]["participants"]
    assert email in participants


def test_unregister_removes_participant():
    client = TestClient(application.app)
    activity = "Programming Class"
    email = "remove.me@example.com"

    # First sign up the test email
    sign_path = f"/activities/{urllib.parse.quote(activity)}/signup?email={urllib.parse.quote(email)}"
    r = client.post(sign_path)
    assert r.status_code == 200

    # Now unregister
    unreg_path = f"/activities/{urllib.parse.quote(activity)}/unregister?email={urllib.parse.quote(email)}"
    r2 = client.post(unreg_path)
    assert r2.status_code == 200
    assert "Unregistered" in r2.json().get("message", "")

    # Verify participant no longer present
    r3 = client.get("/activities")
    participants = r3.json()[activity]["participants"]
    assert email not in participants
