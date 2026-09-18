from app.services.context_enrichment_service import ContextEnrichmentService

SAMPLE_AOI = {
    "type": "Polygon",
    "coordinates": [
        [
            [79.20, 21.60],
            [79.30, 21.60],
            [79.30, 21.70],
            [79.20, 21.70],
            [79.20, 21.60],
        ]
    ],
}


def test_context_enrichment_batching_query_count():
    """DSA Invariant (dsabackendoptimisation.md):

    Context features must be fetched and spatial-tree indexed once per analysis batch,
    NOT once per event (assert query_count == 1 for N events).
    """
    service = ContextEnrichmentService()

    events = [
        {
            "id": f"event-{i}",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [79.22 + i * 0.01, 21.62 + i * 0.01],
                        [79.23 + i * 0.01, 21.62 + i * 0.01],
                        [79.23 + i * 0.01, 21.63 + i * 0.01],
                        [79.22 + i * 0.01, 21.63 + i * 0.01],
                        [79.22 + i * 0.01, 21.62 + i * 0.01],
                    ]
                ],
            },
        }
        for i in range(5)  # 5 distinct events
    ]

    assert service.query_count == 0

    enriched, warnings = service.enrich_events_batch(events, SAMPLE_AOI)

    # Invariant: Exactly 1 spatial query executed for the entire batch of 5 events
    assert service.query_count == 1
    assert len(enriched) == 5

    # Each event has received distances
    for evt in enriched:
        assert evt["nearest_known_road_distance_m"] is not None
        assert evt["nearest_known_road_distance_m"] >= 0.0
        assert evt["nearest_known_settlement_distance_m"] is not None
        assert evt["nearest_known_settlement_distance_m"] >= 0.0


def test_nearest_known_vs_nearest_real_wording():
    """Scientific Invariant (systemdesign.md):

    Field naming and response must clearly distinguish 'nearest known feature in our cached source'
    from any implication that no closer real-world feature exists.
    """
    service = ContextEnrichmentService()
    events = [
        {
            "id": "event-1",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [79.25, 21.65],
                        [79.26, 21.65],
                        [79.26, 21.66],
                        [79.25, 21.66],
                        [79.25, 21.65],
                    ]
                ],
            },
        }
    ]

    enriched, _ = service.enrich_events_batch(events, SAMPLE_AOI)
    evt = enriched[0]

    # Required field names
    assert "nearest_known_road_distance_m" in evt
    assert "nearest_known_settlement_distance_m" in evt
    assert evt["context_source"] == "cached_osm_overpass_v1"

    # Required disclaimer wording
    disclaimer = evt["context_disclaimer"].lower()
    assert "nearest known feature" in disclaimer or "nearest known" in disclaimer
    assert "absence" in disclaimer
    assert "not proof" in disclaimer


def test_context_failure_emits_warning_without_failing_layer():
    """System Invariant (systemdesign.md):

    A context-layer failure must produce a warning, never invalidate an otherwise-ready change layer.
    """
    service = ContextEnrichmentService()
    events = [
        {
            "id": "event-1",
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [79.25, 21.65],
                        [79.26, 21.65],
                        [79.26, 21.66],
                        [79.25, 21.66],
                        [79.25, 21.65],
                    ]
                ],
            },
        }
    ]

    enriched, warnings = service.enrich_events_batch(
        events, SAMPLE_AOI, simulate_context_failure=True
    )

    # Events are still returned
    assert len(enriched) == 1
    # Distances are None
    assert enriched[0]["nearest_known_road_distance_m"] is None
    # Warning is explicitly emitted
    assert len(warnings) >= 1
    assert "context" in warnings[0].lower()
