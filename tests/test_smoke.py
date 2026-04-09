from framework_forge import __version__
from framework_forge.api.app import app


def test_package_version_present() -> None:
    assert __version__ == "0.1.0"


def test_fastapi_app_title() -> None:
    assert app.title == "Framework Forge"
