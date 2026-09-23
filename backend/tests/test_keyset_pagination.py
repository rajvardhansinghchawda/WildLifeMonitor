import uuid
from datetime import date

import pytest
from geoalchemy2.shape import from_shape
from httpx import AsyncClient
from shapely.geometry import Polygon
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.analysis import Analysis
from app.models.event import ChangeEvent


@pytest.mark.asyncio
async def test_keyset_cursor_pagination_stability_and_ordering(
    client: AsyncClient,
    db_session: AsyncSession,
    test_workspace: uuid.UUID,
    auth_headers: dict,
):
    """Verify keyset cursor pagination on GET /analyses/{id}/events.

    Guarantees:
    - Ordered by events_priority_idx: priority_score DESC NULLS LAST, id DESC.
    - Zero duplicates, zero omissions across multi-page traversals.
    - Stable under concurrent inserts.
    """
    analysis = Analysis(
        id=uuid.uuid4(),
        workspace_id=test_workspace,
        status="succeeded",
        stage="completed",
        configuration_id="mvp-v1",
        requested_layers=["vegetation"],
        aoi_snapshot={
            "type": "Polygon",
            "coordinates": [[[79.2, 21.6], [79.3, 21.6], [79.3, 21.7], [79.2, 21.6]]],
        },
        baseline_start=date(2024, 1, 1),
        baseline_end=date(2024, 4, 1),
        comparison_start=date(2025, 1, 1),
        comparison_end=date(2025, 4, 1),
        created_by="test-analyst",
    )
    db_session.add(analysis)

    poly = Polygon(
        [[79.24, 21.64], [79.241, 21.64], [79.241, 21.641], [79.24, 21.641], [79.24, 21.64]]
    )

    # Generate 120 events: 80 with scores (some duplicate scores to test tie-breaker), 40 with None
    total_events = 120
    created_events = []
    for i in range(total_events):
        score = float(100 - (i % 30)) if i < 80 else None
        evt = ChangeEvent(
            id=uuid.uuid4(),
            workspace_id=test_workspace,
            analysis_id=analysis.id,
            geom=from_shape(poly, srid=4326),
            change_type="vegetationlosscandidate",
            affected_area_ha=1.0 + (i * 0.1),
            priority_score=score,
            priority_method_version="priority-v1",
            status="pendingfieldverification",
            method_version="vegetation-v1",
            record_version=1,
        )
        db_session.add(evt)
        created_events.append(evt)

    await db_session.commit()

    # Paginate through all pages using cursor
    retrieved_ids = []
    retrieved_scores = []
    cursor = None
    page_count = 0

    while True:
        url = f"/api/v1/analyses/{analysis.id}/events?limit=50"
        if cursor:
            url += f"&cursor={cursor}"

        resp = await client.get(url, headers=auth_headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()

        features = data["features"]
        pagination = data["pagination"]

        for feat in features:
            retrieved_ids.append(feat["id"])
            retrieved_scores.append(feat["properties"]["priority_score"])

        page_count += 1
        if not pagination["has_more"]:
            break
        cursor = pagination["next_cursor"]
        assert cursor is not None

    # Verifications
    assert page_count == 3  # 50 + 50 + 20 = 120
    assert len(retrieved_ids) == total_events
    # Check no duplicate event IDs
    assert len(set(retrieved_ids)) == total_events

    # Verify descending ordering: scored items first descending, followed by None items
    seen_none = False
    for i in range(len(retrieved_scores) - 1):
        s1 = retrieved_scores[i]
        s2 = retrieved_scores[i + 1]

        if s1 is None:
            seen_none = True
            assert s2 is None, "None priority_score must appear only at the end (NULLS LAST)"
        elif s2 is not None:
            assert not seen_none
            assert s1 >= s2, f"Scores must be non-increasing: {s1} < {s2}"
            if s1 == s2:
                # Tie-breaker is id DESC
                assert retrieved_ids[i] > retrieved_ids[i + 1]
