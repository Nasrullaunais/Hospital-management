# Graph Report - .  (2026-04-27)

## Corpus Check
- Large corpus: 378 files · ~554,994 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 960 nodes · 1367 edges · 42 communities detected
- Extraction: 84% EXTRACTED · 15% INFERRED · 0% AMBIGUOUS · INFERRED: 210 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Server Controllers & Auth|Server Controllers & Auth]]
- [[_COMMUNITY_Expo Router & Client UI|Expo Router & Client UI]]
- [[_COMMUNITY_Project Docs & Planning|Project Docs & Planning]]
- [[_COMMUNITY_Database Seeds & Tests|Database Seeds & Tests]]
- [[_COMMUNITY_Native Performance & Profiling|Native Performance & Profiling]]
- [[_COMMUNITY_Bundle Optimization|Bundle Optimization]]
- [[_COMMUNITY_Ward & Department UI|Ward & Department UI]]
- [[_COMMUNITY_React Native Best Practices|React Native Best Practices]]
- [[_COMMUNITY_JSReact Performance|JS/React Performance]]
- [[_COMMUNITY_List Rendering & Benchmarks|List Rendering & Benchmarks]]
- [[_COMMUNITY_Express Backend Modules|Express Backend Modules]]
- [[_COMMUNITY_E2E Tests & Auth Flow|E2E Tests & Auth Flow]]
- [[_COMMUNITY_Brownfield Migration|Brownfield Migration]]
- [[_COMMUNITY_Seeds & Utilities|Seeds & Utilities]]
- [[_COMMUNITY_Agent Skills & Plugins|Agent Skills & Plugins]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 119|Community 119]]

## God Nodes (most connected - your core abstractions)
1. `Expo Router Navigation` - 53 edges
2. `Hospital Management System` - 19 edges
3. `Bundle Size Optimization` - 17 edges
4. `useColorScheme()` - 15 edges
5. `main()` - 15 edges
6. `delay()` - 14 edges
7. `Hospital Management Client App` - 14 edges
8. `main()` - 13 edges
9. `getRequestContext()` - 12 edges
10. `Express 5 + MongoDB REST Backend` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Upgrading React Native Skill` --conceptually_related_to--> `Hospital Management Client App`  [AMBIGUOUS]
  agent-skills/skills/upgrading-react-native/SKILL.md → client/README.md
- `Hospital Management System` --conceptually_related_to--> `React Native Best Practices Skill`  [INFERRED]
  Docs/Project.md → agent-skills/skills/react-native-best-practices/POWER.md
- `Hospital Management System` --conceptually_related_to--> `Agent Skills Repository`  [INFERRED]
  Docs/Project.md → agent-skills/AGENTS.md
- `async()` --calls--> `updateAppointmentStatus()`  [INFERRED]
  /home/nasrulla/All Files/Projects/Hospital-management/client/app/(doctor)/appointments/index.tsx → /home/nasrulla/All Files/Projects/Hospital-management/server/src/modules/appointments/appointment.controller.ts
- `handleSubmit()` --calls--> `createPrescription()`  [INFERRED]
  /home/nasrulla/All Files/Projects/Hospital-management/client/app/(doctor)/records/add-record.tsx → /home/nasrulla/All Files/Projects/Hospital-management/server/src/tests/testHelper.ts

## Communities

### Community 0 - "Server Controllers & Auth"
Cohesion: 0.04
Nodes (56): handleSubmit(), ApiError, bookAppointment(), cancelAppointment(), getDoctorAppointments(), getMyAppointments(), getMyDoctorSchedule(), updateAppointmentStatus() (+48 more)

### Community 1 - "Expo Router & Client UI"
Cohesion: 0.02
Nodes (27): useAuth(), Badge(), handleBook(), getBadgeColors(), DepartmentListScreen(), DoctorListScreen(), handleSaveAvailability(), Expo Router Navigation (+19 more)

### Community 2 - "Project Docs & Planning"
Cohesion: 0.05
Nodes (56): CRITICAL: Hardcoded MongoDB credentials in reseed.ts, CRITICAL: IDOR vulnerabilities in records & invoices, CRITICAL: JWT token stored in AsyncStorage unencrypted, Domain: ADMIN, Domain: DOCTOR, Domain: PATIENT, Domain: PHARMACIST, Domain: WARD RECEPTIONIST (+48 more)

### Community 3 - "Database Seeds & Tests"
Cohesion: 0.05
Nodes (13): handleSubmit(), makeStyles(), handleAssign(), validate(), connect(), futureDate(), pastDate(), seed() (+5 more)

### Community 4 - "Native Performance & Profiling"
Cohesion: 0.06
Nodes (43): Android 16KB Page Size, Android Studio Memory Profiler, Android Studio Profiler, React Native Builder Bob, Cold Start Detection, collapsable Prop, Fabric Renderer, Flame Graph Profiling (+35 more)

### Community 5 - "Bundle Optimization"
Cohesion: 0.06
Nodes (40): Bundle Size Optimization, Native Performance Optimization, ProGuard/R8 Rules (Android), react-native-fast-image, react-native-screens, Download Size, Install Size, Time to Interactive (TTI) (+32 more)

### Community 6 - "Ward & Department UI"
Cohesion: 0.07
Nodes (14): handleSubmit(), validate(), createDepartment(), isDuplicateKeyError(), createInvoice(), generateInvoiceNumber(), isMongoDuplicateKeyError(), autoSetWardStatus() (+6 more)

### Community 7 - "React Native Best Practices"
Cohesion: 0.08
Nodes (34): App Bundle Size Analysis Guide (bundle-analyze-app.md), JS Bundle Analysis Guide (bundle-analyze-js.md), Animated (79.48 KB) - Animation system, JS Bundle Treemap (source-map-explorer), Components (125.29 KB) - Touchable, ScrollView, etc., react-native core (724.18 KB, 80.5%), Renderer (208.44 KB) - ReactNativeRenderer & ReactFabric, virtualized-lists (57.57 KB) - FlatList internals (+26 more)

### Community 8 - "JS/React Performance"
Cohesion: 0.08
Nodes (33): useDeferredValue Hook, useTransition Hook, FlatList, ScrollView, TextInput, Atomic State Management, JavaScript/React Performance, JavaScript Thread (+25 more)

### Community 9 - "List Rendering & Benchmarks"
Cohesion: 0.07
Nodes (32): React Native App Startup Pipeline, Flashlight CPU and RAM Metrics, Flashlight FPS Graph, Flashlight FlatList vs FlashList Benchmark, FlatList vs FlashList Score Comparison, Flashlight Benchmark Tool, FlashList Performance Characteristics, FlatList Performance Characteristics (+24 more)

### Community 10 - "Express Backend Modules"
Cohesion: 0.13
Nodes (30): AWS Production Deployment Architecture, Appointment Schema (appointment.model.ts), Appointment Booking Module, Auth & Patient Management Module, Billing, Insurance & Deployment Module, TypeScript Build Errors (tsc), Department Schema (department.model.ts), Departments Management Module (+22 more)

### Community 11 - "E2E Tests & Auth Flow"
Cohesion: 0.12
Nodes (19): disconnectDB(), api(), handleLogin(), validateAll(), validateEmail(), validatePassword(), addResult(), cleanup() (+11 more)

### Community 12 - "Brownfield Migration"
Cohesion: 0.18
Nodes (26): Bare Android AAR Generation, Bare Android Native Integration, Bare iOS Native Integration, Bare iOS XCFramework Generation, Bare React Native Quick Start, React Native Brownfield Migration, Android AAR Artifact, AppRegistry.registerComponent (+18 more)

### Community 13 - "Seeds & Utilities"
Cohesion: 0.26
Nodes (17): createAdminUser(), createPngPlaceholder(), delay(), getMongoDb(), main(), seedAppointments(), seedDepartments(), seedDoctors() (+9 more)

### Community 14 - "Agent Skills & Plugins"
Cohesion: 0.1
Nodes (20): AI Assistant Integration Guide, Agent Skills Repository, agentskills.io Specification, Building React Native Apps Plugin, Callstack Company, Claude Code Assistant, Codex Plugin CLI, Cursor Assistant (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (20): Bottom Navigation: Dispense Tab, Bottom Navigation: Home Tab, Bottom Navigation: Inventory Tab, Bottom Navigation: Profile Tab, Building React Native Apps Plugin, Callstack Agent Skills Repository, Callstack Plugin Icon (Building and Testing), Dispense Module UI Theme (+12 more)

### Community 16 - "Community 16"
Cohesion: 0.17
Nodes (8): handleSubmit(), onDateChange(), pickPackagingImage(), validate(), handleSubmit(), validate(), toFormDataFile(), createMedicine()

### Community 17 - "Community 17"
Cohesion: 0.28
Nodes (14): chooseScope(), cloneRepo(), confirmInstall(), copyPluginsPayload(), ensureDir(), getPaths(), getRepoUrl(), loadJsonFile() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (15): Axios API Client, Appointment Booking (Member 3), AuthContext (useAuth), Auth & Patient Profile (Member 1), Billing & Insurance (Member 6), Hospital Management Client App, Departments Module, Doctor & Staff Management (Member 2) (+7 more)

### Community 19 - "Community 19"
Cohesion: 0.26
Nodes (9): formatDate(), handleRegister(), isPasswordValid(), validateAll(), validateConfirm(), validateEmail(), validateName(), validatePassword() (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.47
Nodes (10): authHeaders(), createMedicineForm(), expect(), getData(), getObject(), loginUser(), main(), record() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (1): ReceptionistPage

### Community 22 - "Community 22"
Cohesion: 0.4
Nodes (10): Brownfield Quick Start, Expo SDK Upgrade Layer, Monorepo vs Single-App Targeting, React Upgrade Layer, rn-diff-purge Template Diffs, Upgrade Helper Core Workflow, Upgrade Helper UI, Upgrade Verification (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.25
Nodes (2): apiRequest(), withRetry()

### Community 24 - "Community 24"
Cohesion: 0.29
Nodes (3): ToastSetup(), useToast(), useMessage()

### Community 25 - "Community 25"
Cohesion: 0.48
Nodes (7): Hospital Management App Screenshot (2026-04-25), Android Device (build AQ3A.250226.002), Hospital Management App (com.hospitalmanagement.app), Doctors Module, Hospital Management System, React Native (Expo) Mobile App, Doctor Error Screenshot (2026-04-21)

### Community 26 - "Community 26"
Cohesion: 0.33
Nodes (1): ErrorBoundary

### Community 27 - "Community 27"
Cohesion: 0.33
Nodes (1): MainActivity

### Community 30 - "Community 30"
Cohesion: 0.5
Nodes (1): MainApplication

### Community 31 - "Community 31"
Cohesion: 0.83
Nodes (4): Android Emulator Composite Action, GitHub Actions Skill (simulator/emulator builds, artifacts), iOS Simulator Composite Action, Workflow Wiring and Artifact Downloads

### Community 32 - "Community 32"
Cohesion: 0.83
Nodes (4): Android Adaptive Icon, Android Adaptive Icon Background, Android Adaptive Icon Foreground, Hospital Management App Icon

### Community 33 - "Community 33"
Cohesion: 0.67
Nodes (1): DoctorsIndex()

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (1): DoctorDetailRoute()

### Community 35 - "Community 35"
Cohesion: 0.67
Nodes (1): DepartmentDetailRoute()

### Community 36 - "Community 36"
Cohesion: 0.67
Nodes (1): DepartmentsIndex()

### Community 37 - "Community 37"
Cohesion: 0.67
Nodes (1): WardDetailRoute()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (1): WardsIndex()

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (2): GitHub Skill (PRs, stacked PRs, branch strategies), Stacked PR Workflow

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (2): Browser Check Screenshot, CI Status Check

### Community 117 - "Community 117"
Cohesion: 1.0
Nodes (1): React Native Brownfield Migration Skill

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (1): Six-Member Team Module Assignment

### Community 119 - "Community 119"
Cohesion: 1.0
Nodes (1): API Response Convention (success/data/message)

## Ambiguous Edges - Review These
- `Upgrading React Native Skill` → `Hospital Management Client App`  [AMBIGUOUS]
  agent-skills/skills/upgrading-react-native/SKILL.md · relation: conceptually_related_to
- `Hospital Management App Screenshot (2026-04-25)` → `Hospital Management System`  [AMBIGUOUS]
  server/Screenshot_2026-04-25-00-13-20-637_com.hospitalmanagement.app.jpg · relation: conceptually_related_to

## Knowledge Gaps
- **129 isolated node(s):** `User/Patient Schema`, `Doctor Schema`, `Appointment Schema`, `Medical Record Schema`, `Medicine Schema` (+124 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 21`** (10 nodes): `receptionist.spec.ts`, `ReceptionistPage`, `.constructor()`, `.gotoAssign()`, `.gotoBeds()`, `.gotoDashboard()`, `.gotoMedications()`, `.gotoPatients()`, `.login()`, `.logout()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (8 nodes): `apiRequest()`, `registerClearSession()`, `registerToast()`, `client.ts`, `errorService.ts`, `extractFieldErrors()`, `getFriendlyErrorMessage()`, `withRetry()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (6 nodes): `ErrorBoundary.tsx`, `ErrorBoundary`, `.componentDidCatch()`, `.constructor()`, `.getDerivedStateFromError()`, `.render()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (6 nodes): `MainActivity.kt`, `MainActivity`, `.createReactActivityDelegate()`, `.getMainComponentName()`, `.invokeDefaultOnBackPressed()`, `.onCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (4 nodes): `MainApplication.kt`, `MainApplication`, `.onConfigurationChanged()`, `.onCreate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (3 nodes): `index.tsx`, `index.tsx`, `DoctorsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (3 nodes): `[id].tsx`, `[id].tsx`, `DoctorDetailRoute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (3 nodes): `[id].tsx`, `[id].tsx`, `DepartmentDetailRoute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (3 nodes): `index.tsx`, `index.tsx`, `DepartmentsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `[id].tsx`, `[id].tsx`, `WardDetailRoute()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (3 nodes): `index.tsx`, `index.tsx`, `WardsIndex()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (2 nodes): `GitHub Skill (PRs, stacked PRs, branch strategies)`, `Stacked PR Workflow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (2 nodes): `Browser Check Screenshot`, `CI Status Check`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (1 nodes): `React Native Brownfield Migration Skill`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (1 nodes): `Six-Member Team Module Assignment`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 119`** (1 nodes): `API Response Convention (success/data/message)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Upgrading React Native Skill` and `Hospital Management Client App`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Hospital Management App Screenshot (2026-04-25)` and `Hospital Management System`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Expo Router Navigation` connect `Community 1` to `Community 0`, `Community 3`, `Community 6`, `Community 11`, `Community 16`, `Community 18`, `Community 19`, `Community 24`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Why does `connect()` connect `Community 3` to `Community 0`, `Community 20`, `Community 13`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `Hospital Management Client App` connect `Community 18` to `Community 1`, `Community 22`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Hospital Management System` (e.g. with `React Native Best Practices Skill` and `Agent Skills Repository`) actually correct?**
  _`Hospital Management System` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 14 inferred relationships involving `useColorScheme()` (e.g. with `useThemeColor()` and `Badge()`) actually correct?**
  _`useColorScheme()` has 14 INFERRED edges - model-reasoned connections that need verification._