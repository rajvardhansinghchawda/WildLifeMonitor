# Google Earth Engine (GEE) Setup & Verification Guide

This guide provides operational, step-by-step instructions for provisioning, configuring, and verifying Google Earth Engine access for the Wildlife Habitat Monitoring System backend.

Per `workflow.md`, `rules.md`, and `backendhandoverfile.md`:
> **Crucial Rule:** Registration alone is **not** proof of processing access. A real capability probe must be executed to verify server-side compute evaluation and quota assignment before configuring GEE in active services.

---

## Prerequisites

- A Google Cloud Platform (GCP) account with administrative privileges to create/manage projects, billing, and IAM.
- Python 3.11+ installed locally.
- Google Cloud SDK (`gcloud` CLI) installed (optional, but recommended).

---

## Step 1: Create or Select a GCP Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. In the top project dropdown, select **New Project**.
3. Set a descriptive project name and ID (e.g., `codeniti-wildlife-dev`).
4. Link a valid **Billing Account** to the project.
   > **Note:** Even for non-commercial research or free tier usage, Google Cloud requires an active billing account linked to the GCP project to activate Earth Engine Cloud API services.

---

## Step 2: Enable the Earth Engine API

1. In the GCP Console, open **APIs & Services** > **Library**.
2. Search for **Google Earth Engine API** (`earthengine.googleapis.com`).
3. Click **Enable**.

Alternatively, enable the API via `gcloud` CLI:
```bash
gcloud services enable earthengine.googleapis.com --project <YOUR_GEE_PROJECT_ID>
```

---

## Step 3: Register the Project for Earth Engine Access

Enabling the GCP API alone does not grant access to the Earth Engine compute engine. The GCP project must be explicitly registered with Earth Engine:

1. Visit the [Earth Engine Project Registration](https://code.earthengine.google.com/register).
2. Choose your project type:
   - **Noncommercial / Academic / Research**: Follow the prompts to submit project details for Google's non-commercial review.
   - **Commercial / Cloud Billing**: Attach the project to a paid Cloud Billing account or Earth Engine pricing tier.
3. Confirm that the status for your GCP Project ID indicates registration has been approved.

> [!WARNING]
> **Registration vs. Processing Access:**
> A registered project may still encounter compute denial (`403 Forbidden: Earth Engine API has not been used in project... or it is disabled`) if the service account has inadequate IAM permissions or the project has not established its initial compute quota. Step 6 proves actual compute capability.

---

## Step 4: Create a Service Account & Assign Minimum IAM Roles

Automated backend workers communicate with Earth Engine using a dedicated Google Service Account.

1. In the GCP Console, go to **IAM & Admin** > **Service Accounts**.
2. Click **Create Service Account**.
   - **Name:** `codeniti-gee-worker`
   - **ID:** `codeniti-gee-worker@<YOUR_GEE_PROJECT_ID>.iam.gserviceaccount.com`
   - **Description:** `Service account for CodeNiti backend Earth Engine analysis workers`
3. Click **Create and Continue**.
4. In the **Grant this service account access to project** section, assign the following **exact** predefined roles:
   - **`roles/earthengine.writer`** (*Earth Engine Resource Writer*):
     - Provides permissions to perform interactive computations (`reduceRegion`, raster expressions), manage tasks, and read/write assets.
     - *(Do not assign `roles/earthengine.viewer` alone — viewer permissions allow metadata queries only and will fail when running raster compute reductions. Note also that `roles/earthengine.reader` does not exist in GCP IAM).*
   - **`roles/serviceusage.serviceUsageConsumer`** (*Service Usage Consumer*):
     - Required for the service account to consume API quota on the target project.
5. Click **Done**.

Alternatively, assign these roles via `gcloud`:
```bash
SA_EMAIL="codeniti-gee-worker@<YOUR_GEE_PROJECT_ID>.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding <YOUR_GEE_PROJECT_ID> \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/earthengine.writer"

gcloud projects add-iam-policy-binding <YOUR_GEE_PROJECT_ID> \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/serviceusage.serviceUsageConsumer"
```

---

## Step 5: Generate and Secure the Service Account Key

1. Under **Service Accounts**, click on `codeniti-gee-worker`.
2. Navigate to the **Keys** tab > **Add Key** > **Create new key**.
3. Select **JSON** and click **Create**. The key file will download to your local machine.
4. **Security Enforcement (Zero Secret Leaks):**
   - **NEVER** commit service account JSON keys to git.
   - Store the key file in a secure, untracked location outside the repository or in an ignored directory:
     ```gitignore
     # Ensure keys are untracked
     *.json
     !package*.json
     !tsconfig*.json
     credentials/
     secrets/
     ```
5. Configure your local environment (matching `backendhandoverfile.md`):
   ```dotenv
   GEE_PROJECT_ID="<YOUR_GEE_PROJECT_ID>"
   GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/credentials/codeniti-gee-key.json"
   ```

---

## Step 6: Minimal Capability Probe (Instructional Guide)

To confirm that the provisioned service account has active processing access (and not merely client authentication), execute a small capability probe.

### A. Environment Setup

Install the official Google Earth Engine Python API:
```bash
pip install earthengine-api google-auth
```

### B. Probe Execution Snippet

Copy and run the following Python code in your verified terminal environment. It queries a small AOI (~10 km² near Pench National Park, India) over a 30-day Sentinel-2 window, applies cloud masking, and triggers a server-side `reduceRegion` mean NDVI computation:

```python
import os
import ee
from google.oauth2 import service_account

# 1. Load configuration from environment
project_id = os.environ.get("GEE_PROJECT_ID")
key_path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")

if not project_id or not key_path:
    raise RuntimeError("Missing GEE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS environment variable.")

# 2. Authenticate using Service Account credentials
credentials = service_account.Credentials.from_service_account_file(
    key_path,
    scopes=["https://www.googleapis.com/auth/earthengine"]
)
ee.Initialize(credentials=credentials, project=project_id)
print(f"[SUCCESS] Earth Engine initialized with project: {project_id}")

# 3. Define a small test AOI (Pench buffer ~ 10 km²)
test_aoi = ee.Geometry.Polygon([
    [
        [79.20, 21.60],
        [79.30, 21.60],
        [79.30, 21.70],
        [79.20, 21.70],
        [79.20, 21.60]
    ]
])

# 4. Query Sentinel-2 Surface Reflectance (Harmonized)
# Confirm dataset identifier and bands against EE catalog
s2 = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterBounds(test_aoi)
    .filterDate("2024-01-01", "2024-01-31")
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 30))
)

count = s2.size().getInfo()
print(f"[QUERY] Observations found in window: {count}")
if count == 0:
    raise RuntimeError("Zero observations found for test AOI. Verify coordinates or date range.")

# 5. Execute a server-side reduction to force compute evaluation
def calculate_ndvi(img):
    # SCL band cloud mask: retain vegetation, bare soil, water (classes 4, 5, 6)
    scl = img.select("SCL")
    mask = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6))
    ndvi = img.normalizedDifference(["B8", "B4"]).rename("NDVI")
    return ndvi.updateMask(mask)

mean_ndvi_image = s2.map(calculate_ndvi).mean()

# Trigger computation via reduceRegion
stats = mean_ndvi_image.reduceRegion(
    reducer=ee.Reducer.mean(),
    geometry=test_aoi,
    scale=20,
    maxPixels=1e6
).getInfo()

mean_val = stats.get("NDVI")
print(f"[COMPUTE VERIFIED] Mean NDVI calculated server-side: {mean_val}")
assert mean_val is not None, "Computation returned None — check mask and inputs."
print("[RESULT: WORKING] Earth Engine capability probe completed successfully!")
```

### C. Interpreting Probe Outcomes

| Probe Result | Diagnosis | Action |
|---|---|---|
| `[RESULT: WORKING]` with numeric NDVI value | Compute access and quotas are fully active. | Proceed to record details in `docs/provider-verification-records/gee.md`. |
| `ee.EEException: Earth Engine API has not been used in project...` | Project registration or API enablement is pending. | Review Step 2 and Step 3; ensure project approval has cleared. |
| `google.api_core.exceptions.PermissionDenied` | Missing IAM role on Service Account. | Confirm `roles/earthengine.writer` is granted to the service account. |
| `ee.EEException: Quota exceeded` | Project has reached its EECU-second or concurrent request limit. | Verify billing association and quota tier in GCP Console. |

---

## Step 7: Record Verification in the Project

Once the probe is successfully executed:
1. Open `docs/provider-verification-records/gee.md`.
2. Fill in the actual execution timestamp, account ID, tested AOI, verified dataset/bands, and quota details.
3. Update `Result` to `working`.
4. Submit the verified record as acceptance evidence for task `T01`.
