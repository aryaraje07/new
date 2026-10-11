# RozgarLink API

The API stores accounts in MongoDB and exposes cookie-based authentication for the frontend.

## Start locally

1. Keep your real MongoDB URI, API keys, and JWT secret in `backend/.env`; do not commit that file.
2. Set `MONGO_DB_NAME` to the database to use (defaults to `rozgarlink`).
3. Install dependencies with `npm install`.
4. Run `npm run dev` from this directory.

The frontend's `NEXT_PUBLIC_API_URL` should point to the API prefix, for example `http://localhost:5000/api`.

For MongoDB Atlas, add the backend host's outbound IP address to the cluster's Network Access IP access list and allow outbound TCP connections to port `27017`. An `EACCES` connection error means the backend host or its network policy denied that connection; changing resume-upload code cannot bypass that restriction. A MongoDB connection failure is returned as HTTP `503`.

## Project structure

```text
backend/
├── app.js                      # Express configuration and middleware registration
├── server.js                   # Environment loading, database connection, and startup
├── config/
│   └── database.js             # MongoDB connection helper
├── controllers/
│   ├── applicationController.js # Candidate application and employer applicant handlers
│   ├── authController.js       # Signup, login, logout, and current-user handlers
│   └── healthController.js     # API health handler
│   ├── jobController.js        # Public job listings and employer job management
│   └── profileController.js    # Employer company profile updates
├── middlewares/
│   ├── analysisRateLimiter.js  # Limits expensive AI analysis requests
│   ├── authenticate.js         # JWT session authentication
│   ├── authRateLimiter.js      # Signup/login rate limit
│   ├── errorHandler.js         # Central API error responses
│   ├── notFoundHandler.js      # Unknown endpoint response
│   ├── requireRole.js          # Stakeholder role authorization
│   ├── resumeUpload.js         # Resume multipart upload limits and type checks
│   └── resumeUploadErrorHandler.js
├── models/
│   ├── Application.js          # Persisted candidate applications and final resume snapshots
│   ├── Job.js                  # MongoDB job posting model
│   ├── Resume.js               # Owned source files and versioned drafts
│   ├── ResumeAnalysis.js       # General/role analyses and reviewable suggestions
│   └── User.js                 # Mongoose user model and company profile
├── routes/
│   ├── applicationRoutes.js    # Candidate application and employer applicant endpoints
│   ├── jobRoutes.js            # Public job listings and authenticated employer routes
│   ├── authRoutes.js           # Authentication route definitions
│   ├── healthRoutes.js         # Health route definitions
│   └── resumeRoutes.js         # Candidate-only resume endpoints
├── services/
│   ├── applicationWorkflow.js  # Strict match threshold and analysis freshness checks
│   ├── cloudinaryService.js    # Private resume asset storage
│   ├── resumeAnalysisService.js
│   ├── resumeExportService.js  # PDF/DOCX generation
│   ├── resumeParserService.js  # PDF/DOCX text extraction
│   └── resumeScoringService.js # Transparent resume quality and alignment scoring
└── utils/
    ├── auth.js                 # Session cookies and public user serialization
    ├── corsOptions.js          # Allowed frontend origins
    ├── applySuggestions.js     # Safe exact-text suggestion application
    ├── resumeSections.js       # Resume section normalization
    └── validateSignup.js       # Role-specific signup validation
```

## Authentication endpoints

- `POST /api/auth/signup` creates a candidate, employer, or training-provider account and sets an HTTP-only session cookie.
- `POST /api/auth/login` validates an email and password and sets the session cookie.
- `POST /api/auth/logout` clears the session cookie.
- `GET /api/auth/me` returns the current account when the cookie is valid.
- `PATCH /api/auth/company-profile` updates the authenticated employer's company profile.
- `GET /api/jobs` lists active, unexpired job postings and supports text search, filters and pagination.
- `GET /api/jobs/:jobId` returns authoritative details for an active job.
- `GET /api/jobs/saved`, `PUT /api/jobs/:jobId/save`, and `DELETE /api/jobs/:jobId/save` manage candidate-saved jobs.
- `GET /api/jobs/mine` lists the authenticated employer's postings.
- `POST /api/jobs` validates and stores an authenticated employer's job posting.
- `POST /api/applications` starts or resumes the unique candidate/job application workflow.
- `GET /api/applications/:applicationId` and `PUT /api/applications/:applicationId/resume` retrieve the owned workflow and select an owned resume.
- `POST /api/applications/:applicationId/analyze` analyzes the selected resume against the authoritative job record and returns the server-computed eligibility decision.
- `POST /api/applications/:applicationId/confirm` confirms a fresh passing analysis for the exact job and resume version; `POST /api/applications/:applicationId/submit` submits it idempotently.
- `GET /api/applications/mine` lists candidate applications; `GET /api/applications/employer` lists submissions for the authenticated employer.
- Job postings store experience as minimum/maximum whole years and annual package as optional minimum/maximum LPA values. Public listings render these as explicit ranges (for example, `0–3 years` and `₹6–9 LPA`); older text-based ranges remain readable.
- `GET /health` reports API and MongoDB connection status.

Signup requires contact details and a role-specific profile. New accounts are stored with `verificationStatus: "pending"`; the API does not claim to verify identity or send email until a verification provider is configured.

## Resume workspace endpoints

Resume endpoints require an authenticated candidate session:

- `POST /api/resumes` accepts a PDF or DOCX multipart upload in the `resume` field (maximum 5 MB).
- `GET /api/resumes` and `GET /api/resumes/:resumeId` list and retrieve the candidate's resumes and drafts.
- `POST /api/resumes/:resumeId/analyses` accepts `{ "target": { "type": "resume_review" } }` for a general resume-quality review, a custom role description, or an opportunity ID; opportunity analysis loads the authoritative job and skills from MongoDB.
- `GET /api/resumes/:resumeId/analyses` and `GET /api/resumes/analyses/:analysisId` retrieve previous analyses.
- `PATCH /api/resumes/analyses/:analysisId/suggestions/:suggestionId` edits or rejects a suggestion.
- `POST /api/resumes/analyses/:analysisId/preview` previews selected suggestions; `POST /api/resumes/analyses/:analysisId/apply` saves them as a new version.
- `POST /api/resumes/:resumeId/drafts` saves a manually edited draft; `POST /api/resumes/:resumeId/versions/:versionNumber/restore` restores an earlier version as a new version.
- `POST /api/resumes/:resumeId/versions/:versionNumber/export` creates a PDF or DOCX; authenticated download endpoints serve originals and exports.
- `DELETE /api/resumes/:resumeId` removes a resume and its associated analyses/assets.

Configure Cloudinary credentials for uploads. Resume review and job-match analysis use the Gemini API: set `GEMINI_API_KEY` (from Google AI Studio); `GEMINI_MODEL` defaults to `gemini-3.8-flash`, and `GEMINI_API_URL` optionally overrides the Google Generative Language API base URL. Tailored resume generation is a separate operation and continues to use the xAI Responses API; configure an xAI API credential in `GROK_API_KEY` (`XAI_API_KEY` is also supported), optionally select `GROK_MODEL` (defaults to `grok-4.7`), and optionally override the API base URL with `GROK_API_URL`. API keys are treated as opaque values and validated by their provider. Resume assets remain private and are served through owner-authorized APIs. Resume Studio runs a general quality review against a fixed clarity, evidence, organization, and readability rubric after upload; its score is a backend calculation, not an ATS score or hiring prediction. Role-specific analyses use job-skill evidence and a section-completeness score. The application workflow separately applies the strict `score > 70` gate only to fresh opportunity analyses; this match gate does not replace employer eligibility rules. Before submission, the backend checks candidate ownership, the exact resume version, the current job revision, and a fresh passing analysis. A unique candidate/job index prevents duplicate applications; the submitted application stores an immutable snapshot of the confirmed resume version. Resume analysis becomes stale when the active draft changes. Provider errors are logged with the configured model and a redacted, truncated error message, but never the API key or resume contents.
