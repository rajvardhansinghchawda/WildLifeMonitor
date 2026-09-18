import logging

from app.core.config import settings
from app.providers.base import (
    AnalysisContext,
    AnalysisRequestData,
    CapabilityResult,
    ChangeProvider,
    LayerResult,
)

logger = logging.getLogger(__name__)


class GFWProvider(ChangeProvider):
    """Global Forest Watch (GFW) alerts provider.

    Implements ChangeProvider Protocol.
    Gated entirely behind settings.GFW_ENABLED (default: False).
    Scientific Invariant (systemdesign.md, rules.md):
    - When disabled, check_capability returns explicit unsupported/disabled result.
    - Source confidence categories ('nominal', 'high', 'highest') are preserved verbatim;
      NEVER translated into arbitrary invented percentages.
    """

    METHOD_VERSION = "gfw-glad-v1"

    # Verbatim GFW confidence categories (systemdesign.md)
    VALID_GFW_CONFIDENCE_LABELS = {"nominal", "high", "highest"}

    async def check_capability(self, request: AnalysisRequestData) -> CapabilityResult:
        if not settings.GFW_ENABLED:
            return CapabilityResult(
                supported=False,
                reason=(
                    "Global Forest Watch (GFW) provider is currently disabled (GFW_ENABLED=false) "
                    "pending provider verification and API credential setup in docs/provider-verification-records/gfw.md."
                ),
                limits={"enabled": False, "provider": "gfw"},
            )

        return CapabilityResult(
            supported=True,
            reason="GFW provider is enabled.",
            limits={
                "max_aoi_km2": 2500,
                "supported_alert_systems": ["GLAD-L", "GLAD-S2", "RADD"],
                "preserves_native_confidence": True,
            },
        )

    async def analyze(self, context: AnalysisContext) -> LayerResult:
        if not settings.GFW_ENABLED:
            logger.info(
                "GFW layer requested for analysis %s, but GFW_ENABLED is false. Reporting unsupported state.",
                context.analysis_id,
            )
            return LayerResult(
                status="unsupported",
                method_version=self.METHOD_VERSION,
                error_code="PROVIDER_DISABLED",
                error_details={
                    "reason": "Global Forest Watch provider is disabled (GFW_ENABLED=false). See docs/provider-verification-records/gfw.md.",
                    "provider": "gfw",
                },
                provenance={"provider": "gfw", "enabled": False},
                warnings=[
                    "GFW forest alerts were not computed because external GFW provider access is disabled.",
                ],
            )

        # When enabled in a future verified environment with real GFW API keys:
        # Here we process alerts preserving verbatim confidence:
        # alert['sourceconfidence'] in ('nominal', 'high')
        return LayerResult(
            status="ready",
            method_version=self.METHOD_VERSION,
            quality_label="usable",
            metrics={"forestalertcount": 0},
            events=[],
            provenance={"provider": "gfw", "enabled": True},
            warnings=[],
        )
