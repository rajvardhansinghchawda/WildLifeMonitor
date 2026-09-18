Purpose

Define the product's differentiating capabilities and the constraints that make them credible.

“Superpower” means a useful product capability, not a claim of scientific certainty.

Primary capability: evidence-backed change events

The platform transforms spatial change candidates into inspectable investigation records.

Each event includes:

• Location: A polygon or other explicitly identified geometry.
• Observation periods: Baseline and comparison windows.
• Change classification: What the method detected.
• Magnitude: Area or index change, with units.
• Quality: Observation coverage and relevant limitations.
• Context: Nearby roads, settlements, and boundary relationships.
• Lineage: Dataset, method, configuration, and processing timestamp.
• Workflow state: Pending, investigating, verified, dismissed, or inconclusive.

Capability matrix

| Capability | V1 behavior | Boundary |
|---|---|---|
| Multi-layer comparison | Vegetation, water, built-up candidates | Each layer has separate availability |
| Forest alerts | Import where access and coverage are verified | No assumed global completeness |
| Hotspot prioritization | Rank events with visible factors | Not ecological health diagnosis |
| Human-activity context | Roads and settlements near events | Not causal attribution |
| Before/after review | Matched imagery with dates and quality | Missing imagery is explicit |
| Field verification | Notes and audited status changes | Human assessment remains necessary |

Priority scoring

The initial score is called Investigation Priority, not Habitat Health.

Use three normalized components:

| Component | Meaning | Initial weight |
|---|---|---|
| Magnitude | Change size or strength | 0.50 |
| Sensitivity | Intersection with configured conservation zones | 0.30 |
| Context | Proximity to configured pressure indicators | 0.20 |

Each component ranges from 0 to 1. Multiply the weighted sum by 100 and round for display.

These weights are product heuristics, not validated ecological relationships.

Scoring rules
• Quality is separate from priority. High apparent magnitude with poor observations should remain visible as uncertain.
• Missing required components produce a null score. Do not treat missing context as zero pressure.
• Version the formula. Return prioritymethodversion.
• Expose components. Users must see why an event ranked highly.
• Use configurable thresholds. Threshold changes create a new analysis configuration.
• Do not combine overlapping change areas blindly. An area can exhibit vegetation loss and built-up change simultaneously.

Demonstration standard

A convincing demonstration must show:

A real AOI and actual observation periods.
A spatial change layer.
An event generated from that layer.
An explanation of the evidence.
A field-verification action.
A visible limitation or uncertainty.

V2 capabilities

Future development may add:

• Fragmentation metrics: Patch size, edge density, and connectivity proxies.
• Seasonal baselines: Comparisons against multiple historical years.
• Persistent-change detection: Repeated evidence across observation windows.
• Field observations: Structured observations and attachments.
• Subscriptions: Scheduled analysis after explicit authorization and operational support.

Fragmentation metrics must state their dependence on land-cover definitions, resolution, and ecological assumptions.
