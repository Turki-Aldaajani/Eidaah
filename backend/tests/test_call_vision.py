# #109 · Model.call_vision sends the slide image to the vision model as a data URL.
import os
import sys
from types import SimpleNamespace
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import Model  # noqa: E402


class FakeCompletions:
    def __init__(self):
        self.kwargs = None

    def create(self, **kwargs):
        self.kwargs = kwargs
        message = SimpleNamespace(content="  وصف الشريحة  ")
        return SimpleNamespace(choices=[SimpleNamespace(message=message)])


def test_sends_the_image_as_a_data_url():
    completions = FakeCompletions()
    fake_client = SimpleNamespace(chat=SimpleNamespace(completions=completions))
    with patch.object(Model, "vision_client", fake_client):
        out = Model.call_vision("صف الشريحة", b"\xff\xd8jpeg", max_tokens=500)

    assert out == "وصف الشريحة"
    content = completions.kwargs["messages"][0]["content"]
    assert content[0] == {"type": "text", "text": "صف الشريحة"}
    assert content[1]["image_url"]["url"].startswith("data:image/jpeg;base64,")
    assert completions.kwargs["model"] == Model.VISION_MODEL
    assert completions.kwargs["max_tokens"] == 500


def test_returns_empty_when_vision_is_not_configured():
    with patch.object(Model, "vision_client", None):
        assert Model.call_vision("صف", b"jpeg") == ""
