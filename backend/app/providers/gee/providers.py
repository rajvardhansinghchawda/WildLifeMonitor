"""ChangeProvider adapters backed by real Google Earth Engine computation."""

import asyncio
import logging
from datetime import date
from typing import Any, Callable, Dict, Tuple

from app.core.exceptions import AppException
from app.providers.base import (
    AnalysisContext,
    AnalysisRequestData,
    CapabilityResult,
    ChangeProvider,
    LayerResult,
)
from app.providers.gee import pipeline
from app.providers.gee.client import (
    GeeTransientError,
    GeeUnavailableError,
    classify_ee_error,
    ensure_initialized,
)

logger = logging.getLogger(__name__)

Runner = Callable[[Dict[str, Any], Tuple[date, date], Tuple[date, date]], Dict[str, Any]]


class _GeeProvider(ChangeProvider):
    layer_type: str = ""
    method_version: str = ""
    earliest_date: date = pipeline.S2_FIRST_DATE
    dataset_label: str = ""

    def _runner(self) -> Runner:  # pragma: no cover - overridden
        raise NotImplementedError

    async def check_capability(self, request: AnalysisRequestData) -> CapabilityResult:
        try:
            await asyncio.to_thread(ensure_initialized)
        except GeeUnavailableError as exc:
            return CapabilityResult(supported=False, reason=str(exc))
        if request.baseline_start < self.earliest_date:
            return CapabilityResult(
                supported=False,
                reason=(
                    f"{self.dataset_label} coverage starts {self.earliest_date}; "
                    f"baseline window {request.baseline_start} is earlier."
                ),
            )
        if request.comparison_end > date.today():
            return CapabilityResult(
                supported=False,
                reason="Comparison window ends in the future; no observations exist yet.",
            )
        return CapabilityResult(
            supported=True,
            reason=f"{self.dataset_label} via Google Earth Engine.",
            limits={"native_resolution_m": 10, "dataset": self.dataset_label},
        )

    async def analyze(self, context: AnalysisContext) -> LayerResult:
        runner = self._runner()
        try:
            await asyncio.to_thread(ensure_initialized)
            out = await asyncio.to_thread(
                runner,
                context.aoi,
                (context.baseline_start, context.baseline_end),
                (context.comparison_start, context.comparison_end),
            )
        except GeeUnavailableError as exc:
            return LayerResult(
                status="failed",
                method_version=self.method_version,
                error_code="PROVIDERUNAVAILABLE",
                error_details={"reason": str(exc)},
                warnings=["Earth Engine is not configured for this deployment."],
            )
        except GeeTransientError as exc:
            # Retryable: surfaced as AppException so the provider rate limiter backs off
            raise AppException(
                status_code=503,
                error_code="PROVIDERUNAVAILABLE",
                message=f"Transient Earth Engine failure: {exc}",
                retryable=True,
            ) from exc
        except Exception as exc:  # noqa: BLE001 - classified into a layer outcome
            info = classify_ee_error(exc)
            logger.error("%s provider failed: %s", self.layer_type, exc, exc_info=True)
            if info["retryable"]:
                raise AppException(
                    status_code=503,
                    error_code=info["code"],
                    message=info["message"][:500],
                    retryable=True,
                ) from exc
            return LayerResult(
                status="failed",
                method_version=self.method_version,
                error_code=info["code"],
                error_details={"reason": info["message"][:800]},
                warnings=["Provider computation failed; no metrics were fabricated."],
            )

        return LayerResult(
            status=out["status"],
            method_version=out.get("method_version", self.method_version),
            quality_label=out.get("quality_label"),
            metrics=out.get("metrics", {}),
            error_code=out.get("error_code"),
            error_details=out.get("error_details"),
            events=out.get("events", []),
            payloads=out.get("payloads", []),
            provenance=out.get("provenance", {}),
            warnings=out.get("warnings", []),
        )


class GeeVegetationProvider(_GeeProvider):
    layer_type = "vegetation"
    method_version = "vegetation-gee-v1"
    earliest_date = pipeline.S2_FIRST_DATE
    dataset_label = "Sentinel-2 L2A (COPERNICUS/S2_SR_HARMONIZED)"

    def _runner(self) -> Runner:
        return pipeline.run_vegetation


class GeeWaterProvider(_GeeProvider):
    layer_type = "water"
    method_version = "water-gee-v1"
    earliest_date = pipeline.DW_FIRST_DATE
    dataset_label = "Dynamic World V1 (GOOGLE/DYNAMICWORLD/V1)"

    def _runner(self) -> Runner:
        return pipeline.run_water


class GeeBuiltupProvider(_GeeProvider):
    layer_type = "builtup"
    method_version = "builtup-gee-v1"
    earliest_date = pipeline.DW_FIRST_DATE
    dataset_label = "Dynamic World V1 (GOOGLE/DYNAMICWORLD/V1)"

    def _runner(self) -> Runner:
        return pipeline.run_builtup
