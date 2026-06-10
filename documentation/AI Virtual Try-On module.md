# 04 — AI Virtual Try-On

## Overview

The Virtual Try-On module allows users to visualise themselves wearing any product before purchasing. It accepts a user photo and optional measurements, then processes the image through an 8-stage AI pipeline to generate photorealistic front, side, and back views.

---

## Objectives

- Reduce return rates caused by fit or appearance uncertainty
- Increase purchase confidence, especially for first-time buyers
- Provide a differentiated, memorable shopping experience
- Support both logged-in (saved avatar) and guest (one-time session) usage

---

## User Inputs

### Photo Input

| Type | Description | Requirements |
|------|-------------|--------------|
| Full body image | Standing, full-length photo | Min 800px height, plain background preferred |
| Half body image | Waist-up photo | For upper-body garments only |

**Supported formats:** JPEG, PNG, WebP  
**Max file size:** 10 MB  
**Lighting guidance:** Well-lit, front-facing, minimal occlusion

### Measurement Inputs (Optional)

| Measurement | Unit | Required | Notes |
|-------------|------|----------|-------|
| Height | cm | Recommended | Improves scale accuracy |
| Weight | kg | Optional | Informs body shape estimation |
| Chest circumference | cm | Optional | High-impact for shirt fit |
| Waist circumference | cm | Optional | |
| Shoulder width | cm | Optional | |

If measurements are not provided, the model estimates them from the photo.

### Product Inputs (System-Provided)

| Input | Source |
|-------|--------|
| Product ID | Selected product |
| Product primary image | Product catalog S3 |
| 360° product images | Product catalog S3 |
| Garment metadata | Category, fit type, fabric, size chart |

---

## Processing Pipeline (8 Stages)

```
Stage 1: Human Detection
      ↓
Stage 2: Body Segmentation
      ↓
Stage 3: Pose Estimation
      ↓
Stage 4: Body Measurement Estimation
      ↓
Stage 5: Avatar Creation
      ↓
Stage 6: Garment Mapping
      ↓
Stage 7: Image Rendering
      ↓
Stage 8: Quality Validation
```

### Stage 1 — Human Detection

- Detects the presence and bounding box of one or more human figures in the photo.
- Rejects images with no detected human, multiple humans, or heavily occluded subjects.
- Model: YOLO-based detector or equivalent.

### Stage 2 — Body Segmentation

- Produces a pixel-level segmentation mask separating the human body from the background.
- Enables clean garment overlay without background bleeding.
- Model: Segment Anything Model (SAM) or custom U-Net.

### Stage 3 — Pose Estimation

- Identifies 17+ body keypoints (joints: shoulders, elbows, wrists, hips, knees, ankles).
- Determines body pose (standing, slight lean, arms at side, etc.).
- Informs how the garment drapes on the estimated body posture.
- Model: OpenPose, MediaPipe, or HRNet.

### Stage 4 — Body Measurement Estimation

- Estimates chest, waist, hip, shoulder width, and height from keypoints + photo scale.
- Combines with user-provided measurements when available (user inputs take priority).
- Outputs a normalised body shape vector for avatar creation.

### Stage 5 — Avatar Creation

- Builds a 3D or parametric avatar from the estimated body shape.
- Avatar matches the user's body proportions.
- Persistent avatars can be saved to the user profile for reuse across sessions.

### Stage 6 — Garment Mapping

- Maps the selected garment's 2D pattern onto the 3D avatar's surface.
- Accounts for fabric physics: drape, stretch, shadow, and weight.
- Warps garment to match avatar posture and body curvature.

### Stage 7 — Image Rendering

- Composites the garment-wearing avatar onto the original photo background (or a neutral studio background if selected).
- Applies realistic lighting, shadow, and colour matching to the original photo.
- Generates three views: **front**, **side (left)**, and **back**.

### Stage 8 — Quality Validation

- Automated quality gate checking:
  - No visible artefacts at garment boundaries
  - Correct colour reproduction
  - Proportion plausibility check (garment not stretched beyond physical limits)
- **Pass:** Results delivered to the user.
- **Fail:** Job is flagged for retry or user is shown a graceful fallback message.

---

## Outputs

| Output | Description |
|--------|-------------|
| Front view | Full-body front render with garment |
| Side view | Left-side profile render |
| Back view | Rear render |

**Format:** JPEG or WebP, 1200 × 1400 px  
**Delivery:** Signed S3 URLs, valid for 24 hours  
**Storage retention:** 30 days from generation, then auto-deleted via S3 lifecycle policy

---

## Asynchronous Job Architecture

Virtual try-on is computationally expensive (GPU-intensive). It runs as an **asynchronous background job**.

```
Client Request
      │
      ▼
POST /api/try-on/initiate
      │  Returns: { job_id, status: "queued" }
      │
      ▼
Bull Job Queue (Redis)
      │
      ▼
Try-On Worker (GPU instance)
      │  8-stage pipeline
      ▼
Results stored in S3
      │
      ▼
Webhook / polling → Client notified
GET /api/try-on/{job_id}/status
```

**Polling interval:** Every 3 seconds  
**Estimated processing time:** 10–30 seconds depending on photo complexity

---

## Avatar Persistence

Registered customers can save their avatar for reuse:

| Field | Description |
|-------|-------------|
| `avatar_id` | UUID |
| `user_id` | FK to users |
| `measurements` | JSON body measurements |
| `avatar_model_url` | S3 path to avatar model |
| `created_at` | Timestamp |

Saved avatars allow instant try-on without re-uploading a photo.

---

## Database Table: `virtual_try_ons`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | |
| `user_id` | UUID (nullable) | Null for guest sessions |
| `session_id` | String | Guest session identifier |
| `product_id` | UUID | |
| `status` | Enum | `queued` \| `processing` \| `completed` \| `failed` |
| `input_photo_url` | String | S3 path to uploaded photo |
| `measurements` | JSONB | User-provided measurements |
| `output_front_url` | String | |
| `output_side_url` | String | |
| `output_back_url` | String | |
| `error_message` | String | Populated on failure |
| `created_at` | Timestamp | |
| `expires_at` | Timestamp | 30 days from creation |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/try-on/initiate` | Upload photo + measurements, queue job |
| GET | `/api/try-on/:jobId/status` | Poll job status |
| GET | `/api/try-on/:jobId/results` | Fetch output image URLs |
| GET | `/api/try-on/history` | User's try-on history (auth required) |
| DELETE | `/api/try-on/:jobId` | Delete a try-on session |

---

## Error Handling

| Error Code | Cause | User Message |
|-----------|-------|-------------|
| `NO_HUMAN_DETECTED` | No person found in photo | "We couldn't detect a person in your photo. Please upload a clear, full-body photo." |
| `MULTIPLE_HUMANS` | More than one person | "Please upload a photo with only one person." |
| `QUALITY_FAILED` | Rendering quality gate failed | "We had trouble generating your try-on. Please try again with a better-lit photo." |
| `TIMEOUT` | Processing exceeded 60s | "Try-on is taking longer than expected. We'll notify you when it's ready." |
| `UNSUPPORTED_FORMAT` | Invalid file type | "Please upload a JPEG, PNG, or WebP image." |
