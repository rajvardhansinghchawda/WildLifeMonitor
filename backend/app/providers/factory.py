from typing import Dict

from app.core.config import settings
from app.providers.base import ChangeProvider
from app.providers.gfw_provider import GFWProvider


def build_providers() -> Dict[str, ChangeProvider]:
    """Select real Earth Engine providers, or deterministic fixtures ONLY in fixture mode (tests)."""
    gfw = GFWProvider()
    if settings.PROVIDER_MODE.lower() == "fixture":
        from app.providers.fixture_builtup_provider import FixtureBuiltupProvider
        from app.providers.fixture_vegetation_provider import FixtureVegetationProvider
        from app.providers.fixture_water_provider import FixtureWaterProvider

        return {
            "vegetation": FixtureVegetationProvider(),
            "water": FixtureWaterProvider(),
            "builtup": FixtureBuiltupProvider(),
            "forestalerts": gfw,
            "gfw": gfw,
        }

    from app.providers.gee.providers import (
        GeeBuiltupProvider,
        GeeVegetationProvider,
        GeeWaterProvider,
    )

    return {
        "vegetation": GeeVegetationProvider(),
        "water": GeeWaterProvider(),
        "builtup": GeeBuiltupProvider(),
        "forestalerts": gfw,
        "gfw": gfw,
    }
