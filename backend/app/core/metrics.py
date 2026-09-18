from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

# 1. HTTP signals
HTTP_REQUESTS_TOTAL = Counter(
    "codeniti_http_requests_total",
    "Total incoming HTTP requests",
    ["method", "endpoint", "status_code"],
)
HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "codeniti_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint"],
    buckets=[0.05, 0.1, 0.2, 0.3, 0.5, 1.0, 2.5, 5.0],
)

# 2. Queue signals
QUEUE_DEPTH = Gauge(
    "codeniti_queue_depth",
    "Number of queued analysis jobs waiting in Redis queue",
    ["queue_name"],
)
QUEUE_AGE_SECONDS = Gauge(
    "codeniti_queue_age_seconds",
    "Age in seconds of the oldest unprocessed job in queue",
    ["queue_name"],
)

# 3. Job execution signals
JOB_DURATION_SECONDS = Histogram(
    "codeniti_job_duration_seconds",
    "Total analysis execution duration in seconds",
    ["method_version", "status"],
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 120.0, 300.0],
)

# 4. Provider signals
PROVIDER_LATENCY_SECONDS = Histogram(
    "codeniti_provider_latency_seconds",
    "Latency of external or synthetic provider calls in seconds",
    ["provider"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0],
)
PROVIDER_THROTTLES_TOTAL = Counter(
    "codeniti_provider_throttles_total",
    "Count of provider rate-limit or 429 throttle events",
    ["provider"],
)

# 5. Scientific quality signals
VALID_DATA_COVERAGE_FRACTION = Histogram(
    "codeniti_valid_data_coverage_fraction",
    "Observed valid pixel fraction across analyzed AOI support",
    ["layer_type"],
    buckets=[0.1, 0.25, 0.5, 0.7, 0.8, 0.9, 0.95, 1.0],
)

# 6. Cache reuse signals
CACHE_HITS_TOTAL = Counter(
    "codeniti_cache_hits_total",
    "Total cache hits",
    ["cache_type"],
)
CACHE_MISSES_TOTAL = Counter(
    "codeniti_cache_misses_total",
    "Total cache misses",
    ["cache_type"],
)

# 7. Worker health signals
WORKER_HEARTBEAT_AGE_SECONDS = Gauge(
    "codeniti_worker_heartbeat_age_seconds",
    "Seconds elapsed since last heartbeat received from worker",
    ["worker_id"],
)

# 8. Artifact publication signals
ARTIFACT_PUBLICATION_FAILURES_TOTAL = Counter(
    "codeniti_artifact_publication_failures_total",
    "Total failures encountered during artifact upload or checksum validation",
    ["artifact_type"],
)


def export_prometheus_metrics() -> bytes:
    """Generate Prometheus exposition format representation of all registered metrics."""
    return generate_latest()
