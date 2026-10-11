# SkillifyAI Project Documentation

## 1. Purpose

SkillifyAI provides role-based learning and competency assessment for official-statistics and related domains. The platform supports:

- Learner registration with a prototype designation or target role.
- Initial competency diagnostics based on MongoDB role mappings.
- Face registration and face-aware assessment proctoring.
- Scheduled exams and self-tests.
- Competency scores, competency history, and skill gaps.
- Personalized learning recommendations and course-completion assessments.
- Personal Learning Memory, Quick Recall, and progress visualizations.
- Faculty or Training Officer material upload and quiz generation.
- Learner material viewing and material-based quiz generation.
- Trainer learner monitoring and current competency views.
- Multilingual learner interface in English, Hindi, and Marathi.
- Grievance management with SLA monitoring, notifications, and escalation.
- Coding tests, oral assessments, interviews, and related learning tools.
- Optional blockchain result integrity records.

The application has two primary runtime services:

| Service | Technology | Local URL |
| --- | --- | --- |
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS | `http://localhost:3000` |
| Backend | Node.js, Express 5, Mongoose | `http://localhost:5000` |

MongoDB stores users, roles, competency mappings, exams, attempts, evidence, recommendations, materials, and optional blockchain records. Ollama runs the local Qwen model used for new quiz and diagnostic generation.

## 2. Repository Layout

```text
backend/
  server.js                 Express entry point and route mounting
  controllers/              HTTP request handlers
  models/                   Mongoose schemas
  routes/                   Express route modules
  services/                 Competency, AI, course, and assessment logic
  ai/gateway/               Policy-aware provider gateway
  providers/                Legacy provider abstraction
  config/                   Database, AI, blockchain, and external-service config
  blockchain/               Hardhat contract and deployment scripts
  tools/                    Seed and administration scripts
  uploads/                  Local upload fallback directory

frontend/
  app/                      Next.js App Router pages
  components/               Shared UI and role-specific components
  contexts/                 Subscription and application contexts
  lib/                      API, authentication, and browser helpers
  public/                   Static assets and face-model files
```

## 3. Local Setup

### 3.1 Prerequisites

- Node.js 18 or newer.
- npm 8 or newer.
- A reachable MongoDB instance.
- Ollama installed and reachable at `http://localhost:11434`.
- The exact model named by `OLLAMA_MODEL` installed in Ollama.
- A browser with camera permission for face registration and proctored assessments.

### 3.2 Install

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

### 3.3 Backend environment

Copy `backend/.env.example` to `backend/.env`. The minimum local configuration is:

```env
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000
MONGODB_URI=<mongodb-connection-string>
DB_NAME=skillify_sih
JWT_SECRET=<strong-random-secret>
JWT_EXPIRY=1d

AI_PRIVATE_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_TIMEOUT_MS=300000
OLLAMA_NUM_CTX=4096
OLLAMA_KEEP_ALIVE=10m
GEMINI_FALLBACK_ENABLED=false
```

The configured Qwen tag must match `ollama list`. Do not invent a model name. If the environment has a different Qwen tag, set `OLLAMA_MODEL` to that exact tag.

Optional integrations include Cloudinary, SerpAPI, email, blockchain, Gemini-based legacy features, Groq, and LM Studio. They are not required for the local role-based quiz and diagnostic flow.

### 3.4 Frontend environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### 3.5 Start services

Terminal 1:

```powershell
ollama run qwen2.5:7b
```

Terminal 2:

```powershell
cd backend
npm run dev
```

Terminal 3:

```powershell
cd frontend
npm run dev
```

The backend health endpoint is `GET http://localhost:5000/api/health`.

## 4. Seed and Administration

Create an administrator account:

```powershell
cd backend
npm run create-admin
```

Seed the SIH competency foundation:

```powershell
npm run seed:sih
```

The seed data must include active `Role` documents and `RoleCompetency` mappings. Diagnostics cannot be generated for a role that has no active role mapping.

Useful MongoDB entities:

| Entity | Purpose |
| --- | --- |
| `User` | Learners, trainers, and administrators |
| `Role` | Prototype designations or target roles |
| `Competency` | Assessable skills |
| `RoleCompetency` | Required competency and level for a role |
| `UserCompetency` | Current learner score and level |
| `CompetencyHistory` | Immutable evidence history per assessment |
| `SkillGap` | Required level versus current level |
| `Exam` | Scheduled, diagnostic, material, or standard assessment |
| `ExamAttempt` | Learner attempt and submitted answers |
| `Material` | Uploaded learning content and extracted chunks |
| `Course` | Personalized learning recommendation |

## 5. Learner Lifecycle

### 5.1 Registration

The learner selects a Prototype Designation/Target Role during registration. Registration stores the role only. It must not assign proficiency scores.

The learner may also complete face registration. Face registration stores the face embedding and marks the account as face verified; it does not create competency evidence.

### 5.2 Initial Competency Diagnostic

The normal flow is:

```text
Register and select targetRole
  -> Face registration
  -> POST /api/ai/diagnostics
  -> Find active Role by targetRole
  -> Read RoleCompetency mappings
  -> Generate role-specific questions with Ollama/Qwen
  -> Persist Exam as Initial Competency Diagnostic
  -> Start ExamAttempt
  -> Face-aware assessment
  -> Submit answers
  -> Update UserCompetency and CompetencyHistory
  -> Recalculate SkillGap
  -> Show current competency and recommendations
```

The diagnostic generator is role-specific. Statistical Officer and Statistical Analyst receive different competency sets when their `RoleCompetency` mappings differ. The generator validates that every mapped competency is covered by at least one question.

The endpoint is idempotent for a learner and role. If an existing diagnostic or completed attempt exists, it is reused rather than regenerated.

Endpoint:

```text
POST /api/ai/diagnostics
Authorization: Bearer <token>
Body: { "questionCount": 10 }
```

Before submission, the learner UI displays `Not Assessed`. The diagnostic must be completed before a score is shown.

### 5.3 Assessment submission

Scheduled exams use:

```text
GET  /api/learner/exams/scheduled
POST /api/learner/exams/scheduled/:examId/start
POST /api/learner/exams/attempts/:attemptId/submit
GET  /api/learner/exams/attempts/:attemptId/result
```

The learner quiz screen preserves fullscreen, camera, face checks, warning handling, and automatic submission. Diagnostic attempts are stored as `ExamAttempt` records just like assigned exams.

Face checks are sent to:

```text
POST /api/proctor/face-check
```

The proctor endpoint supports both legacy `QuizAttempt` records and scheduled `ExamAttempt` records.

## 6. Competency Engine

`backend/services/competencyEngine.js` is the single source of truth for competency evidence.

For each answered competency-mapped question, the engine:

1. Groups answers by `question.competency`.
2. Calculates evidence separately for each competency.
3. Converts the evidence percentage into the configured level scale.
4. Creates or updates the learner's `UserCompetency` record.
5. Writes a `CompetencyHistory` record with previous and current values.
6. Recalculates `SkillGap` using the role's required level.

Initial evidence uses the latest diagnostic score when no previous score exists. Later evidence updates the existing competency record using the configured previous/latest weighting; it does not create an unrelated score.

Relevant endpoints:

```text
GET /api/learner/competencies
GET /api/learner/competencies/required
GET /api/learner/competencies/overview
GET /api/learner/skill-gaps
```

The overview is used by the learner dashboard, Profile, Skill Gaps, Courses, and trainer learner details.

## 6.1 Competency Framework Definition

The current framework is a representative prototype framework aligned with FRAC-style competency thinking. It is not presented as an official FRAC publication or an official MoSPI competency standard. The application defines the framework in the SIH foundation seed file and persists it in MongoDB so that roles and mappings can be changed without changing frontend code.

The implementation is based on five layers:

1. **Competency domains** group related capabilities.
2. **Competencies** define the assessable skills within each domain.
3. **Prototype roles** represent the learner's selected designation or target role.
4. **RoleCompetency mappings** connect a role to its required competencies, required level, importance weight, and rationale.
5. **Assessment evidence** converts question performance into current scores, levels, and skill gaps.

### Domains

The seeded framework currently uses four domains:

| Domain | Scope |
| --- | --- |
| Statistical Competencies | Survey design, sampling, statistical methods, official-statistics production, metadata, and data quality |
| Technical Competencies | Python, R, SQL, Stata, SPSS, SAS, GIS, visualization, AI/ML, cloud, APIs, and open data |
| Digital Governance | Cybersecurity, data privacy, digital signatures, government cloud, and digital public infrastructure |
| Behavioural and Managerial | Leadership, communication, project management, ethics, decision making, and change management |

### Competency records

Each `Competency` document has:

- A human-readable `name` such as `Survey Design`, `SQL`, or `Data Quality Frameworks`.
- A stable uppercase code such as `STAT_SURVEY_DESIGN`, `TECH_SQL`, or `STAT_DATA_QUALITY`.
- A domain reference.
- An active flag.

Stable codes make role mappings and generated-question metadata independent of display names.

### Role mappings

Each `RoleCompetency` document contains:

- `role`: the prototype role.
- `competency`: the assessable skill.
- `requiredLevel`: the expected proficiency level from 0 to 5.
- `importanceWeight`: the relative importance of the competency for that role, from 0 to 1.
- `isMandatory`: whether the mapping is required.
- `rationale`: why the mapping is included.

For example, the seeded `Statistical Officer` role emphasizes Survey Design, Sampling, Data Quality Frameworks, Metadata Standards, Python, SQL, Data Visualization, Data Privacy, Communication, and Decision Making. The seeded `Statistical Analyst` role instead emphasizes Statistical Methods, Data Quality Frameworks, Python, R, SQL, Data Visualization, AI/ML, and Communication. This difference is what makes the initial diagnostic role-specific.

The source of these prototype mappings is `backend/tools/seedSihFoundation.js`. The seed comment intentionally describes them as representative mappings aligned with FRAC principles, not as an official FRAC source. Teams should review and replace the mappings with approved organizational or government competency standards before production use.

### Proficiency and scoring model

Question evidence is calculated independently for each competency. The engine produces a 0–100 score and maps it to the current prototype level scale:

| Score | Level |
| ---: | ---: |
| 0–39 | 1 |
| 40–54 | 2 |
| 55–69 | 3 |
| 70–84 | 4 |
| 85–100 | 5 |

When there is no previous assessment, the latest assessment score becomes the baseline. For later evidence, the engine combines the prior score and latest evidence using the centralized 70/30 rule:

```text
current score = (previous score * 0.7) + (latest assessment score * 0.3)
```

Difficulty affects evidence weighting inside an assessment: hard questions carry more weight than medium questions, and medium questions carry more weight than easy questions. The resulting score is still bounded to 0–100 before it is converted to a level.

### Skill-gap model

For each role-mapped competency, the engine compares `requiredLevel` from `RoleCompetency` with the learner's `currentLevel` from `UserCompetency`:

```text
gap = required level - current level
```

- `open`: gap is greater than zero.
- `addressed`: gap is zero or negative.
- `Not Assessed`: no assessment score exists yet; the current score is not invented from registration or profile fields.

This model drives personalized course recommendations and post-course assessments. To change the framework, update the seed or managed MongoDB role mappings, then regenerate or update learner recommendations; do not hardcode scores in the UI.

## 7. Learning Recommendations and Course Assessments

The recommendation flow is:

```text
Current competency evidence
  -> Open SkillGaps
  -> Course discovery and fallback catalogue
  -> Persist Course and Recommendation
  -> Learner opens official resource
  -> Learner clicks Completed
  -> Ollama generates a competency-specific assessment
  -> Exam is assigned to that learner
  -> Learner takes and submits the assessment
  -> Competency engine updates the same UserCompetency record
```

Endpoints:

```text
GET  /api/courses/recommended
GET  /api/courses/recommendations
POST /api/courses/:courseId/complete
```

Official resource links are normalized to relevant platform destinations. MoSPI resources use the MoSPI search endpoint, and SWAYAM resources use the official course explorer at `https://swayam.gov.in/explorer`. Existing cached or persisted bare-homepage links are migrated when recommendations load.

## 8. Materials and Material-Based Quizzes

### 8.1 Trainer or Training Officer

```text
POST /api/trainer/upload-material
GET  /api/trainer/materials
POST /api/trainer/generate-quiz-from-material
POST /api/trainer/materials/:materialId/generate-assessment
POST /api/trainer/materials/:materialId/assessment
```

Material upload requires topic, subject, file, and distribution target. Classification is not a user-facing requirement for normal material quizzes. The backend still keeps its policy and provider safeguards.

Material text is extracted and chunked. Quiz generation uses relevant chunks where competency metadata exists and bounded material context otherwise. Questions are generated by the configured local Ollama/Qwen provider with mixed difficulty.

### 8.2 Learner

Learners can open an assigned material and generate a material-based quiz:

```text
POST /api/learner/materials/:materialId/generate-quiz
```

The generated assessment is saved as a scheduled `Exam` assigned to that learner, so it uses the existing exam attempt, face verification, result, and competency update flow.

## 9. Trainer and Administrator Workflows

Trainer routes are mounted under both `/api/trainer` and legacy faculty-compatible prefixes. Common endpoints include:

```text
GET  /api/trainer/dashboard
GET  /api/trainer/students
GET  /api/trainer/classes
GET  /api/trainer/materials
POST /api/trainer/upload-material
POST /api/trainer/exams/create
```

The View Learners screen loads each learner's current role-mapped competency overview from MongoDB. It displays competency, required level, current score, gap, status, and last assessed date.

Semester and marksheet workflows are mounted under `/api/admin/semesters` and `/api/learner/marksheets`.

## 10. AI Provider Rules

New diagnostics and competency-aware quiz generation use:

```text
Ollama -> configured Qwen model -> structured JSON -> validation -> persistence
```

Gemini and Groq are not fallback providers for new quiz or diagnostic generation. Legacy AI features such as some mentor, tutor, grievance, oral, interview, or other integrations may have separate configuration and provider paths.

The backend contains two related provider layers. The policy-aware gateway in `backend/ai/gateway/` routes classified content and can use private Ollama or LM Studio providers, while the older `backend/providers/` abstraction supports historical Ollama/Gemini behavior used by legacy integrations and health reporting. Restricted or competency-sensitive content must remain on a private provider; external providers must not receive restricted material.

Check provider health:

```powershell
ollama list
ollama ps
Invoke-RestMethod http://localhost:11434/api/tags
Invoke-RestMethod http://localhost:5000/api/health
```

If Qwen generation is slow:

- Confirm the model is loaded with `ollama ps`.
- Keep the model warm with `OLLAMA_KEEP_ALIVE=10m`.
- Use the exact configured model tag.
- Avoid sending full documents; material generation uses bounded chunks.
- Review backend logs for timeout and JSON validation errors.
- Do not increase frontend timeouts indefinitely without checking CPU or memory pressure.

## 11. Testing and Quality Checks

Backend tests:

```powershell
cd backend
npm test
```

The current suite covers competency calculations, AI policy behavior, provider health, and structured output validation.

Frontend typecheck:

```powershell
cd frontend
npm run type-check
```

Frontend production build:

```powershell
npm run build
```

Useful syntax checks for a changed backend file:

```powershell
node --check path\to\file.js
```

Manual acceptance checks:

1. Register a learner with a configured target role.
2. Complete face registration.
3. Confirm an `Initial Competency Diagnostic` is created once.
4. Confirm questions correspond to that role's `RoleCompetency` mappings.
5. Complete the attempt and verify `UserCompetency`, `CompetencyHistory`, and `SkillGap` documents.
6. Refresh the dashboard and confirm scores persist.
7. Complete a later competency-specific assessment and confirm the same competency record is updated.
8. Open Courses and verify official resource links.
9. Upload material as a trainer and generate a grounded quiz.

## 12. Learner Personalization Features

### Learning Memory

Learning Memory records concept-level performance in addition to competency scores. It tracks attempts, correct and incorrect answers, recent and average performance, mastery state, last activity, and the next recall date. The state is calculated deterministically by `backend/services/learningMemoryService.js`:

| State | Rule |
| --- | --- |
| `needs_recall` | Correct rate is below 40% |
| `mastered` | Correct rate is at least 75% and there are at least 3 attempts |
| `developing` | All other cases |

Recall is scheduled using a seven-day interval. The dashboard reads this data through:

```text
GET /api/learner/learning-memory
GET /api/learner/learning-memory/recall
GET /api/learner/learning-memory/recall/:competencyId
GET /api/learner/learning-memory/:competencyId
```

### Quick Recall

The `/learner/quick-recall` page lets a learner choose a concept that needs practice, retrieve a question from previous competency-tagged attempts, answer it, and receive immediate feedback. Recently shown question IDs are retained to reduce repetition. This feature uses existing question history; it is not a separate generated question bank.

### Dashboard analytics

The learner dashboard aggregates real database records into progress trend, initial-versus-current comparison, skill-gap distribution, priority gaps, and training impact visualizations. Data comes from `CompetencyHistory`, `UserCompetency`, `SkillGap`, and `TrainingHistory`; empty histories produce empty states rather than fabricated scores.

## 13. Roles and Application Areas

### Learner / Government Official

Learners select a target role, complete diagnostics, view their competency profile, address skill gaps through recommended learning, take scheduled or material-based assessments, and review learning memory and progress. They may also use code-editor, interview, oral, and mentor/tutor features where enabled.

### Trainer / Faculty / Administrator

Trainers and faculty create classes, upload materials, generate quizzes and exams, assign learning to learners, review submissions, inspect competency analytics, and monitor learner progress. The public role-selection flow also exposes an administrator or organization view for workforce analytics and competency program management. Exact permissions are enforced by authentication and role middleware rather than by frontend navigation alone.

### Parent compatibility role

Parent functionality is retained for older grievance, notification, and relationship data but is not part of the primary SIH registration or navigation flow. See [LEGACY_PARENT_FUNCTIONALITY.md](../backend/LEGACY_PARENT_FUNCTIONALITY.md) before extending or removing these routes.

## 14. Supporting Workflows

### Grievances and real-time notifications

The grievance module provides submission, status tracking, escalation, and SLA-related processing. The backend uses Socket.IO rooms named from the user's role and ID to send real-time grievance notifications. On Render, the server starts the SLA monitoring and timeout services; the local implementation uses `node-cron` and `nodemailer` when configured. An n8n-based workflow is also documented as an integration option in [N8N_WORKFLOW_GUIDE.md](../backend/N8N_WORKFLOW_GUIDE.md).

Relevant route prefixes:

```text
/api/grievance
/api/notifications
```

### Exams, quizzes, oral assessments, and interviews

The platform contains canonical learner/trainer exam routes and legacy student/faculty-compatible aliases. Exams and quiz attempts share authentication, proctoring, submission, results, and competency evidence concepts where the relevant controller supports them. Oral and interview routes provide additional assessment and practice workflows; they are separate modules and should not be assumed to update competency evidence unless their controller explicitly invokes the competency engine.

### Code editor and coding assessments

The frontend exposes learner and student code-editor paths backed by `/api/learner/code-editor` and `/api/student/code-editor`. Coding tests and coding-test results are persisted separately from standard multiple-choice exam attempts.

### Language support

The frontend uses a static translation system with English (`en`), Hindi (`hi`), and Marathi (`mr`) translations. Language switching is handled client-side through `LanguageContext`; it does not send learner content to an external translation service. The Bhashini route exists for integrations, but the current UI translation implementation is static.

## 15. Optional Integrations

| Integration | Purpose | Required for core local flow |
| --- | --- | --- |
| MongoDB / MongoDB Atlas | Application persistence | Yes |
| Ollama with Qwen | Private diagnostic and quiz generation | Yes for AI generation |
| LM Studio | Alternative private model provider | No |
| Gemini / Groq / OpenAI-compatible providers | Legacy or policy-authorized external AI features | No |
| Cloudinary | Managed file storage | No, local uploads are available |
| Socket.IO | Real-time grievance and notification events | No for basic page navigation |
| SMTP / Nodemailer | Email notifications and escalation | No |
| n8n | External grievance automation option | No |
| Hardhat and ethers | Blockchain result recording and verification | No |
| Bhashini | Translation integration endpoint | No for current static UI translations |

### Blockchain verification

Blockchain support is an integrity layer, not the source of truth for learner competency. When configured, a result hash can be recorded and later verified with an audit trail. The default development network is Hardhat Local. Setup and environment details are in [BLOCKCHAIN_SETUP.md](../BLOCKCHAIN_SETUP.md) and [BLOCKCHAIN_QUICK_REFERENCE.md](../BLOCKCHAIN_QUICK_REFERENCE.md).

## 16. Technology Stack

### Frontend

- Next.js 14 App Router and React 18.
- TypeScript 5.4 and Tailwind CSS 3.
- Radix UI primitives and local UI components for accessible controls.
- Axios for API calls and JWT Decode for token handling.
- React Hook Form and Zod for form handling and validation.
- Recharts and Framer Motion for analytics and interaction.
- face-api.js for browser-side face registration and proctoring support.
- Monaco Editor for coding workflows.
- Socket.IO client for real-time events.
- jsPDF and AutoTable for client-side report/export generation.

### Backend

- Node.js with native ES modules.
- Express 5 for HTTP APIs and middleware.
- Mongoose 9 for MongoDB schemas and persistence.
- JWT and bcryptjs for authentication and password protection.
- express-validator for request validation.
- Multer and Cloudinary adapters for file uploads.
- Socket.IO for real-time communication.
- node-cron and Nodemailer for scheduled SLA and email workflows.
- pdf-parse, Mammoth, XLSX, PDFKit, and related document/report tooling.

### AI and data policy

- Ollama is the default private/local inference service.
- Qwen is the default local model configured through `OLLAMA_MODEL`.
- The AI gateway applies classification and provider-routing policy before generation.
- Structured JSON generation is parsed and validated before questions are persisted.

### Blockchain

- Solidity contracts managed with Hardhat.
- ethers.js 6 for provider, wallet, contract, and verification operations.
- MongoDB retains application-side blockchain record metadata.

## 17. API and Architecture Conventions

- `/api/auth` handles registration and login.
- `/api/learner` contains the canonical learner experience.
- `/api/trainer` contains the canonical trainer experience.
- `/api/ai` contains diagnostic and AI-related operations.
- `/api/courses` contains recommendations and course completion.
- `/api/proctor` contains face and assessment monitoring operations.
- `/api/grievance` and `/api/notifications` support grievance workflows.
- `/api/verify` supports verification-related operations.

Controllers handle HTTP concerns, services contain reusable business rules, models define persistence, and route modules expose the API. `competencyEngine.js` is the authoritative competency-evidence calculation service. Legacy `/api/student` and `/api/faculty` prefixes remain mounted for compatibility; new frontend work should use the canonical learner/trainer prefixes.

## 18. Production Boundaries and Limitations

- The seeded competency framework is a representative prototype and must be reviewed against approved organizational standards before production use.
- Local Ollama is not automatically available on a hosted backend; production needs a reachable private inference deployment or an approved managed provider.
- Face embeddings and assessment evidence require an explicit organizational privacy, retention, and access policy.
- Local upload storage is suitable for development but should be replaced with durable managed storage in production.
- Blockchain recording is optional and does not replace MongoDB persistence or normal result authorization.
- Quick Recall currently uses questions from previous attempts and therefore has limited variety until a dedicated question bank is added.
- Parent routes and several legacy AI/quiz paths remain for compatibility and should be treated as maintenance surfaces, not the primary product contract.

## 19. Deployment

### Frontend

The frontend can be deployed to Vercel. Configure:

```env
NEXT_PUBLIC_API_URL=https://<backend-host>/api
```

### Backend

The backend can run on Render or another Node-compatible host. Configure the production MongoDB URI, JWT secret, CORS/client URL, upload provider, and Ollama endpoint. Local Ollama is not automatically available in a hosted environment; use a reachable private Ollama deployment or a managed internal inference service that is compatible with the configured provider boundary.

### Blockchain

Blockchain setup is optional. See [BLOCKCHAIN_SETUP.md](../BLOCKCHAIN_SETUP.md) for Hardhat compilation, local node startup, contract deployment, and environment configuration.

## 20. Security and Data Handling

- Keep secrets only in environment variables or a managed secret store.
- Use a strong production `JWT_SECRET`.
- Restrict MongoDB network access.
- Do not expose Ollama publicly without network controls.
- Validate generated question structure before persistence.
- Do not commit uploaded documents, private keys, API keys, or `.env` files.
- Preserve face data and assessment evidence according to the deployment organization's privacy requirements.

## 21. Troubleshooting

### Backend does not start

Check that `MONGODB_URI`, `JWT_SECRET`, and `PORT` are set. Then run:

```powershell
cd backend
npm run dev
```

### Frontend cannot reach the API

Confirm the backend is running on port 5000 and that `frontend/.env.local` contains:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Restart Next.js after changing environment variables.

### Diagnostic says no role mapping exists

Check that the learner's `targetRole` exactly matches an active `Role.name` and that `RoleCompetency` rows exist for that role. Run the SIH seed script if the database is empty.

### Ollama generation times out

Run `ollama list` and `ollama ps`, start the exact configured model, check CPU/RAM availability, and inspect the backend error message. The application uses bounded context and output sizes, but Qwen 7B generation can still be slow on CPU.

### Course links open a homepage

Refresh `/learner/courses` to trigger persisted-link normalization. New MoSPI links use site search and SWAYAM links use the official explorer.

### Face verification fails

Use a browser with camera permission, complete face registration first, and ensure the frontend can load the face-api model files from `frontend/public`.

## 22. Related Documentation

- [Blockchain setup](../BLOCKCHAIN_SETUP.md)
- [Blockchain quick reference](../BLOCKCHAIN_QUICK_REFERENCE.md)
- [Grievance API documentation](../backend/GRIEVANCE_API_DOCS.md)
- [Backend grievance setup](../SETUP_GRIEVANCE.md)
- [Frontend deployment notes](../frontend/README.md)
