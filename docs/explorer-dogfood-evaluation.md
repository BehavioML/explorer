# Explorer dogfood evaluation

Date: 2026-06-05

## Scope and method

This evaluation originally dogfooded the Explorer slice and the Explorer
BehavioML model to identify product and architecture friction before proposing
new Explorer functionality. The built-in example loader added after this
evaluation partially addresses the onboarding blocker below by loading canonical
examples directly from `BehavioML/specifications` without vendoring them.

Requested targets:

- `examples/quic`
- `examples/oauth-authorization-code`
- `examples/whip`
- the Explorer model itself

What could be evaluated in this checkout:

- The Explorer model itself, archived from `specs/001-model-explorer/behavioml-draft` and loaded through the same archive/root-detection/validation/entity-index/search path used by Explorer.
- The repository-level `behavioml/` directory was also packaged as a sanity check, but it currently contains no populated model scopes and is rejected by root detection.

What could not be evaluated in this checkout:

- `examples/quic`, `examples/oauth-authorization-code`, and `examples/whip` are not present under this repository. No `examples/` directory was found locally, and the installed `@behavioml/validator` package did not include those examples. This is itself a P1 dogfood finding because the requested evaluation set is not discoverable from the Explorer repository.
- Browser screenshot validation was attempted after starting the production preview, but Playwright's Chromium browser was not installed and browser download was blocked by the environment with HTTP 403 from the Playwright CDN. The evaluation therefore relied on the Explorer core/browser-adapter/validator flow from Node rather than visual browser interaction.

Commands used for evaluation:

```bash
find /workspace -maxdepth 5 -type d \( -name quic -o -name oauth-authorization-code -o -name whip \) -print
find node_modules/@behavioml -maxdepth 5 -type d \( -name quic -o -name oauth-authorization-code -o -name whip -o -name examples \) -print
tar -czf /tmp/explorer-eval/explorer-model.tgz specs/001-model-explorer/behavioml-draft
tar -czf /tmp/explorer-eval/root-behavioml.tgz behavioml
npm run build
npm run preview -- --host 127.0.0.1
npx playwright install chromium
npx tsx tmp-evaluate-core.ts
```

## Observed Explorer baseline

The current implementation is accurately framed as a first vertical slice:
archive upload, root detection, validation, path-based overview, scope-oriented
entity browsing, path/text search, diagnostics, workspace tabs, and raw
read-only source viewing are implemented; general-purpose remote archive loading,
semantic navigation, line highlighting, semantic field navigation,
reference/backlink resolution, generated/supporting artifact discovery, diagram
rendering, editing, and Explorer-owned BehavioML semantics are intentionally
deferred.

Loading the Explorer model itself produced:

- model root: `specs/001-model-explorer/behavioml-draft/model/`
- extracted validation files: 81
- path-derived entities: 81
- validation result: failed with 6 error diagnostics for missing `workspace/discover_generated_artifacts` and `workspace/discover_supporting_artifacts` references.

The repository-level `behavioml/` package was rejected with `workspace_root_not_found` because it contains no populated model-scope directories.

## P1 findings

### P1.1 Requested example workspaces are now loadable from their canonical source

The original highest-priority blocker was the absence of the requested dogfood
targets in this checkout. `examples/quic`, `examples/oauth-authorization-code`,
and `examples/whip` are still not copied into this repository, but Explorer now
provides a built-in loader that fetches them from the canonical
`BehavioML/specifications` repository ZIP and selects the requested
`examples/<name>/model/` subtree in memory.

Impact:

- Explorer quality can now be evaluated against realistic protocol-sized models from the UI when network access to GitHub is available.
- The examples remain canonical upstream assets rather than Explorer-owned fixtures, so local/offline dogfooding still requires an uploaded archive or future mocked fixture path.
- Future feature proposals can use QUIC/OAuth/WHIP domain models without committing those models into Explorer.

Missing information:

- Expected validation health for each example over time as `BehavioML/specifications` evolves.
- Whether a future manifest or release artifact should replace direct main-branch ZIP loading.
- Expected user questions for each example, such as “find the token exchange step” or “trace QUIC handshake paths.”

### P1.2 The Explorer model exposes validation diagnostics that require source/YAML inspection to understand

The Explorer model itself loads, but validation reports six missing-capability errors. The diagnostics identify exact files and fields, but the next step is still raw YAML inspection. In particular, workflows refer to generated/supporting artifact discovery capabilities, and `components/explorer_core.yaml` references the same capabilities, while the visible model files do not include matching capability entities at the expected paths.

Impact:

- Explorer can tell the user that a reference is missing, but it cannot yet answer the core review question: “what referenced entity is missing, who references it, and what nearby modeled concept is related?”
- The user must manually open YAML, read `capability:` and `implements.capabilities` fields, and cross-check paths by search.
- Diagnostics are path/field-level, not relationship-level in the UI.

Places where raw YAML is still required:

- Understanding workflow steps, because the meaningful interaction data is in YAML `steps` objects.
- Understanding component capability implementations, because capability lists are raw YAML arrays.
- Confirming whether a missing reference is a model omission, naming mismatch, stale model reference, or validator/root issue.

### P1.3 Explorer cannot perform its own modeled reference/backlink workflows yet

The Explorer model includes explicit workflows for following references and inspecting backlinks, but the current implementation intentionally does not resolve references or compute backlinks. The README makes that limitation clear, and the model also records that Validator should remain the semantic engine rather than Explorer inventing a parser/resolver.

Impact:

- Users can search for reference-like strings, but cannot click a semantic reference from a workflow step to the target capability/entity.
- Users cannot ask “what references this capability?” without text search and manual interpretation.
- Diagnostics for missing references are less actionable because the inverse relationship graph is absent from the UI.

Repeated workflow caused by this gap:

1. Select an entity.
2. Read source YAML.
3. Copy or mentally parse a referenced ID.
4. Search the ID or path fragment.
5. Open likely target.
6. Use browser/back context manually to return.

### P1.4 Browser-level dogfooding is fragile without a committed loaded-workspace smoke fixture

A production build succeeds, and the app can be started with Vite preview, but loaded-workspace browser validation could not run because this environment could not download Playwright Chromium. Existing smoke coverage checks the empty shell, but the dogfood task needs a loaded-workspace flow that exercises archive selection, overview, entity selection, source viewing, diagnostics, search, and tab/context preservation.

Impact:

- Regressions in the loaded Explorer workflow can pass build/type/unit checks.
- Evaluation depends on ad hoc archive creation and local browser availability.
- Screenshots of loaded states are not reproducible in CI from committed fixtures.

## P2 findings

### P2.1 Navigation is path-oriented before it is task-oriented

The Explorer panel groups by model scope and path-derived identity. This is useful for implementation inspection, but realistic domain models will likely be explored by intent: handshake, authorization exchange, ingest session, role, participant, state transition, diagnostic, generated diagram, or referenced artifact. The current scope tree gives no semantic preview of what an entity does beyond its file name.

Navigation friction:

- The user has to know which scope contains the concept they want.
- Nested domain flows are visible as file paths rather than as behavior-level landmarks.
- The overview gives counts but does not suggest high-value starting points.

Missing information:

- Entity descriptions in lists/search results.
- Primary role/participant summary for workflows.
- Referenced capability/interface/entity counts per selected item.
- Diagnostic count badges on scope groups or entities beyond selected-file context.

### P2.2 Search is useful but noisy because it mixes path hits and raw source hits without semantic ranking

Local search over path-derived metadata and raw source is a good baseline. In the Explorer model, broad searches such as `workflow`, `capability`, `reference`, and `diagram` produce many path or YAML-line matches. The user must distinguish entity hits from incidental source matches.

Repeated workflow:

1. Type a broad concept.
2. Scan mixed entity/source results.
3. Open a result.
4. Read YAML context.
5. Refine query.
6. Repeat until the semantic target is clear.

Candidate future feature, after evaluation:

- Semantic ranking and filters should come from Validator/index data when available, not from Explorer-owned parsing.

### P2.3 Diagnostics navigate to files, not to the exact semantic location

Diagnostics include `filePath` and `fieldPath`, and Explorer can navigate to the selected file. However, the source pane remains raw text and does not highlight the specific YAML field. The README explicitly calls out line highlighting and semantic field navigation as deferred.

Navigation friction:

- For short files this is acceptable; for realistic examples it will be slow.
- `fieldPath` values such as `steps[6].capability` require users to count YAML list items or search within the file.
- The inspector can tell the user the diagnostic context but not visually anchor it in source.

Places where raw YAML is still required:

- Finding `steps[N].capability` in workflows.
- Finding `implements.capabilities[N]` in component files.
- Understanding whether a diagnostic is attached to an item, nested field, or whole document.

### P2.4 Diagram and relationships modes advertise future work but cannot yet reduce navigation work

The workbench reserves Diagrams and Relationships modes, and this is honest: no fake relationship graph is rendered. During dogfooding, however, those are exactly the views that would reduce repeated raw-YAML navigation for workflows and protocol examples.

Missing information:

- Which workflows are diagrammable.
- Whether generated diagrams exist for a loaded workspace.
- Whether a selected entity has incoming/outgoing references.
- Whether a diagnostic affects a diagrammed path.

### P2.5 Workspace onboarding assumes archive packaging knowledge

Explorer currently accepts `.tgz`, `.tar.gz`, and `.zip` archives and documents supported root layouts. That is appropriate for the slice, but dogfooding shows that a user with local model directories has to know how to package them correctly before Explorer can load them.

Navigation friction:

- There is no in-product path from “I have `examples/quic` on disk” to “Explorer can inspect it” unless the user already knows to create an archive.
- An empty or scaffold `behavioml/` directory fails root detection, which is correct, but the resulting message does not show which directories/files were found or what to do next.

Candidate future feature, after evaluation:

- Documented fixture/archive commands or a local-directory development harness would be lower risk than adding broad new loading semantics immediately.

## P3 findings

### P3.1 The overview is accurate but not yet a review dashboard

The overview reports source, model root, validation files, diagnostics, and scope counts. That orients the user, but it does not yet prioritize likely next actions.

Candidate future feature, after evaluation:

- Add review-oriented summary sections once semantic data is available: top diagnostics by entity, unresolved references, largest workflows, orphaned entities, generated artifacts, and entry workflows.

### P3.2 Entity display names are file names, not model titles

Path-derived display names are predictable and avoid false semantics. For larger examples, though, the display name may be less useful than the YAML description or model-level name.

Candidate future feature, after evaluation:

- Prefer Validator-provided semantic names/descriptions when exposed, falling back to path-derived names.

### P3.3 Search and diagnostics context are transient

The current UI preserves selected diagnostic/search context in the inspector/source panel, but there are no deep links, breadcrumbs, or history stacks for “return to previous entity after following a result.” The Explorer model already includes `navigation/preserve_context`, so this is a visible gap between model intent and slice behavior.

Candidate future feature, after evaluation:

- Add explicit breadcrumbs/history once reference navigation exists, rather than inventing navigation state before semantic targets are available.

### P3.4 Generated and supporting artifacts remain invisible

Generated artifact and supporting artifact concepts are present in the Explorer model, but discovery is deferred in implementation. Until discovery exists, users cannot inspect reports/diagrams/source-map context alongside model source inside Explorer.

Candidate future feature, after evaluation:

- Add artifact discovery after resolving the current missing-capability model inconsistency, using declared workspace artifact locations and keeping source-of-truth boundaries clear.

## Proposed new Explorer functionality after evaluation

The evaluation points to a staged roadmap. The ordering matters: semantic navigation should not be implemented by Explorer-specific YAML parsing; it should be driven by Validator APIs or explicit model/index outputs.

### Recommended P1 functionality

1. **Keep canonical example loading stable and documented.** The UI now loads `examples/quic`, `examples/oauth-authorization-code`, and `examples/whip` from `BehavioML/specifications`; future work should add mocked smoke fixtures or a manifest/release artifact only if needed, without vendoring canonical examples into Explorer.
2. **Add a loaded-workspace smoke fixture and test.** Keep it small, committed, and representative enough to exercise archive upload, overview, entity selection, source viewing, diagnostics, search, and tab/context behavior.
3. **Expose semantic references/backlinks through Validator-backed data.** Do not parse YAML in Explorer. Add a boundary that can provide outgoing references, incoming references, and unresolved-reference diagnostics with target/source metadata.
4. **Navigate diagnostics to exact source locations.** Use Validator-provided source locations when available; otherwise show field-path breadcrumbs and local source search hints without pretending to know YAML AST semantics.

### Recommended P2 functionality

1. **Add semantic result filters and ranking.** Separate entity, source, diagnostic, reference, and artifact matches; rank exact semantic IDs above incidental raw source matches.
2. **Add entity previews.** Display Validator-provided description, role/participant summary, outgoing reference count, incoming reference count, and diagnostics count in lists and search results.
3. **Add relationship panels before diagrams.** A textual incoming/outgoing reference panel will likely deliver more value and less risk than immediate diagram rendering.
4. **Improve root-load failure explanations.** Show detected candidate directories, recognized scope directories, and a concrete “archive should contain one of...” hint.

### Recommended P3 functionality

1. **Review dashboard.** Promote diagnostics, unresolved references, orphaned entities, and major workflows from count-only overview into guided review entry points.
2. **Generated/supporting artifact discovery.** Make reports, source maps, generated diagrams, and related artifacts inspectable without confusing them with authoritative model source.
3. **Breadcrumb/history support.** Add after reference/backlink navigation lands so preserve-context behavior has real semantic targets.
4. **Diagram surfaces.** Render workflow/state-machine diagrams only after semantic graph and artifact discovery boundaries are stable.

# Dogfood pass 2: built-in examples

Date: 2026-06-05

## Method

This pass re-ran the dogfood evaluation after Explorer gained built-in example
loading for canonical examples from `BehavioML/specifications`. The goal was to
validate the new real usage path for QUIC, OAuth Authorization Code, and WHIP,
while keeping the evaluation documentation-only and avoiding product-code
changes.

Inspection covered:

- The requested browser validation skill was not available in this environment's
  installed skill list, so this pass followed the repository's browser testing
  documentation and Playwright smoke-test configuration instead.
- `README.md`, especially the current status, workbench layout, and built-in
  example loading notes.
- this dogfood document, to preserve the previous findings and compare against
  the original example-availability blocker.
- `src/adapters/browser/canonicalExamples.ts`, which defines the QUIC, OAuth
  Authorization Code, and WHIP example IDs, fetches the `BehavioML/specifications`
  main-branch ZIP, selects `examples/<id>/model/`, preserves relative model
  paths, and returns a normal `ArchiveExtractionResult` for the shared validation
  and indexing pipeline.
- `docs/testing/browser-testing.md`, `playwright.config.ts`,
  `playwright.global-setup.ts`, and the current smoke/unit tests.

Commands run:

```bash
npm ci
npm run typecheck
npm test
npm run build
npm run test:browser
npx playwright install --with-deps chromium
curl -I -L https://github.com/BehavioML/specifications/archive/refs/heads/main.zip
curl -L https://github.com/BehavioML/specifications/archive/refs/heads/main.zip -o /tmp/specifications-main.zip
npm run preview -- --host 127.0.0.1
curl -I http://127.0.0.1:4173/explorer/
node --import tsx tmp/evaluate-pass2.ts
node --import tsx tmp/evaluate-pass2-localzip.ts
```

Validation path used:

1. `npm run typecheck`, `npm test`, and `npm run build` passed.
2. `npm run test:browser` did not run browser validation because Playwright
   Chromium was not installed and no system Chromium executable was configured.
3. `npx playwright install --with-deps chromium` installed OS dependencies, but
   the browser binary download from `https://cdn.playwright.dev/...` failed with
   HTTP 403 `Domain forbidden`. Browser visual validation therefore did **not**
   succeed and no screenshot validation is claimed for this pass.
4. The production preview was started and served `/explorer/` successfully over
   HTTP, but Chromium was unavailable for interactive UI validation.
5. A direct Node call to `loadCanonicalExampleWorkspace()` failed for all three
   canonical examples because Node's built-in `fetch` attempted a direct GitHub
   connection and failed with `connect ENETUNREACH 140.82.114.4:443`. This is a
   local environment/proxy limitation of the Node evaluation harness, not a code
   change request.
6. To evaluate the shared built-in-example selection path anyway, the same GitHub
   ZIP was downloaded with `curl`, which succeeded through the environment proxy,
   then passed to `extractRegularTextFilesFromZip()` and
   `createCanonicalExampleWorkspace()`. From that point onward, evaluation used
   Explorer's canonical subtree selection, root detection, validation,
   path-derived entity index, overview, diagnostics, and search code.

Temporary local scripts used for the evaluation were removed after recording the
results.

## Results by example

### QUIC

- Loading succeeds: yes, through the canonical example subtree path when the
  `BehavioML/specifications` ZIP is available. The browser/UI click path could
  not be visually confirmed because Chromium was unavailable.
- Model root/source label: source label
  `BehavioML/specifications/examples/quic`; detected model root
  `<archive root>` after selecting `examples/quic/model/`.
- Number of files/entities: 37 validation files and 37 path-derived entities.
- Scope counts: 6 workflows, 3 roles, 9 capabilities, 3 interfaces,
  4 components, 3 modules, 1 entity, 7 events, 1 state machine, and 0 decisions.
- Validation result: valid.
- Diagnostics summary: 0 errors, 0 warnings, 0 other diagnostics.
- First useful entities inspected:
  `workflows/client/establish_connection`,
  `workflows/client/handle_handshake_failure`,
  `workflows/server/accept_connection`, `roles/client`, `roles/endpoint`,
  `roles/server`, `capabilities/connection/perform_handshake`,
  `interfaces/crypto/tls_handshake`, and `state-machines/connection_lifecycle`.
- Navigation friction: the model is small enough that scope grouping is usable,
  but the first meaningful review question is already relationship-oriented:
  from a workflow step, which capability, event, component, and interface does it
  connect to? The UI currently makes that a manual sequence of search and source
  inspection.
- Missing information: no explicit relationship panel, no incoming references,
  no outgoing references, and no semantic summary of workflow steps.
- Source YAML inspection required: yes. Explorer can open the selected source,
  but understanding the handshake flow still requires reading workflow `steps`,
  capability references, emitted events, and state-machine transition YAML.
- Search behavior: helpful for targeted terms like `handshake` and `transport`;
  noisy for broad terms like `connection`, which produced many results; empty for
  a mismatched expectation like `stream`.
- Would relationships/backlinks help? Yes, immediately. QUIC is the clearest
  example where a selected workflow should expose referenced capabilities,
  emitted/consumed events, implemented interfaces, and incoming references.
- Would diagrams help immediately? Yes, but only after the relationship data is
  available from Validator or a shared semantic index. The first useful diagram
  would be workflow step flow plus event/state-machine context, not a generic
  file graph.
- Are document-style tabs now clearly needed? Helpful but not the first blocker.
  QUIC benefits from keeping a workflow, a capability, source, diagnostics, and a
  future diagram open together, but relationship/backlink navigation would reduce
  more friction first.

### OAuth Authorization Code

- Loading succeeds: yes, through the canonical example subtree path when the
  `BehavioML/specifications` ZIP is available. The browser/UI click path could
  not be visually confirmed because Chromium was unavailable.
- Model root/source label: source label
  `BehavioML/specifications/examples/oauth-authorization-code`; detected model
  root `<archive root>` after selecting
  `examples/oauth-authorization-code/model/`.
- Number of files/entities: 84 validation files and 84 path-derived entities.
- Scope counts: 11 workflows, 5 roles, 23 capabilities, 7 interfaces,
  6 components, 4 modules, 4 entities, 19 events, 1 state machine, and
  4 decisions.
- Validation result: valid.
- Diagnostics summary: 0 errors, 0 warnings, 0 other diagnostics.
- First useful entities inspected:
  `workflows/authorization_server/handle_authorization_request`,
  `workflows/authorization_server/handle_token_request`,
  `workflows/authorization_server/issue_authorization_code`,
  `workflows/client/start_authorization`,
  `workflows/client/exchange_code_for_tokens`,
  `workflows/resource_server/serve_protected_resource`, `roles/client`,
  `roles/authorization_server`, and `roles/resource_owner`.
- Navigation friction: OAuth is large enough that the left tree and text search
  are no longer sufficient for comprehension. The main task is tracing a
  protocol story across client, authorization server, resource owner, resource
  server, events, and token/code entities.
- Missing information: semantic flow summaries, outgoing references from a
  workflow step, incoming references to capabilities/entities/events, and a way
  to keep multiple protocol views open while comparing them.
- Source YAML inspection required: yes. Understanding the authorization code
  exchange requires reading multiple workflow YAML files and matching capability
  IDs manually.
- Search behavior: useful for precise domain terms, but noisy for core OAuth
  words. `authorization` hit the configured 100-result limit, `token` returned
  92 results, `client` returned 66, and `redirect` returned 40. `scope` returned
  only one result, which was useful but also shows plain text search does not
  expose semantic OAuth concepts consistently.
- Would relationships/backlinks help? Yes, and more urgently than diagrams.
  OAuth needs “who references this token/code/capability/event?” and “what does
  this workflow step point to?” before a diagram can be trusted.
- Would diagrams help immediately? Yes for workflow sequence diagrams and role
  interaction diagrams, but only if generated from canonical semantic data from
  BehavioML/generator or a shared SDK/artifact path.
- Are document-style tabs now clearly needed? Yes. OAuth exposes the need to
  keep `start_authorization`, `handle_authorization_request`,
  `issue_authorization_code`, `exchange_code_for_tokens`, source, and search
  results open as document-like tabs.

### WHIP

- Loading succeeds: yes, through the canonical example subtree path when the
  `BehavioML/specifications` ZIP is available. The browser/UI click path could
  not be visually confirmed because Chromium was unavailable.
- Model root/source label: source label
  `BehavioML/specifications/examples/whip`; detected model root `<archive root>`
  after selecting `examples/whip/model/`.
- Number of files/entities: 90 validation files and 90 path-derived entities.
- Scope counts: 9 workflows, 2 roles, 39 capabilities, 3 interfaces,
  5 components, 4 modules, 2 entities, 20 events, 2 state machines, and
  4 decisions.
- Validation result: valid.
- Diagnostics summary: 0 errors, 0 warnings, 0 other diagnostics.
- First useful entities inspected: `workflows/client/create_session`,
  `workflows/client/discover_ice_servers`, `workflows/client/follow_redirect`,
  `workflows/client/restart_ice`, `workflows/client/terminate_session`,
  `workflows/client/trickle_ice_candidate`,
  `workflows/endpoint/reject_invalid_offer`,
  `workflows/endpoint/reject_unauthorized_request`, `roles/whip_client`,
  `roles/whip_endpoint`, and `capabilities/whip/allocate_ingest_session`.
- Navigation friction: WHIP has fewer roles but many capabilities and events, so
  the user quickly needs to understand the relationships around session
  creation, SDP offers, ICE restart, trickle ICE, and resource deletion.
- Missing information: state-machine transition context, workflow-to-event
  references, capability implementations, and incoming references to WHIP
  resource/session concepts.
- Source YAML inspection required: yes. The path-derived entity list gives a
  useful outline, but the important protocol behavior is inside workflow steps
  and capability/event references.
- Search behavior: mixed. `session`, `resource`, `endpoint`, and `offer` found
  many relevant results but were noisy; `publish` found only one source match,
  suggesting the user-facing domain name and model vocabulary may differ.
- Would relationships/backlinks help? Yes. WHIP especially needs backlinks from
  events/capabilities to workflows and components so the user can see how the
  session lifecycle is modeled.
- Would diagrams help immediately? Yes for session lifecycle and workflow/event
  diagrams, but the dependency remains semantic data from Validator/shared index
  and generator-produced artifacts rather than Explorer-owned diagram logic.
- Are document-style tabs now clearly needed? Yes. WHIP requires comparing
  workflow, state machine, source, and several capabilities/events during normal
  review.

### Explorer model, if evaluated

- Loading succeeds: yes, by packaging
  `specs/001-model-explorer/behavioml-draft` as a local `.tgz` and using the
  archive/root-detection path.
- Model root/source label: source label `explorer-model-pass2.tgz`; detected
  model root `specs/001-model-explorer/behavioml-draft/model/`.
- Number of files/entities: 81 validation files and 81 path-derived entities.
- Scope counts: 13 workflows, 4 roles, 22 capabilities, 7 interfaces,
  4 components, 4 modules, 6 entities, 17 events, 1 state machine, and
  3 decisions.
- Validation result: has diagnostics.
- Diagnostics summary: 6 errors, 0 warnings, 0 other diagnostics.
- Diagnostics observed:
  - `workflows/workspace/inspect_overview.yaml`, `steps[2].capability`: missing
    capability `workspace/discover_generated_artifacts`.
  - `workflows/workspace/inspect_overview.yaml`, `steps[3].capability`: missing
    capability `workspace/discover_supporting_artifacts`.
  - `workflows/workspace/load_from_uploaded_archive.yaml`, `steps[6].capability`:
    missing capability `workspace/discover_generated_artifacts`.
  - `workflows/workspace/load_from_uploaded_archive.yaml`, `steps[7].capability`:
    missing capability `workspace/discover_supporting_artifacts`.
  - `components/explorer_core.yaml`, `implements.capabilities[1]`: missing
    capability `workspace/discover_supporting_artifacts`.
  - `components/explorer_core.yaml`, `implements.capabilities[2]`: missing
    capability `workspace/discover_generated_artifacts`.
- First useful entities inspected: `workflows/navigation/inspect_backlinks`,
  `workflows/navigation/navigate_reference`, `workflows/search/search_workspace`,
  `workflows/source/inspect_source_yaml`, `workflows/validation/inspect_diagnostic`,
  `workflows/workspace/inspect_overview`, and
  `workflows/workspace/load_from_uploaded_archive`.
- Navigation friction: diagnostics point to files and fields, but the user still
  must inspect YAML and search manually to understand which references are
  missing and who else expects them.
- Missing information: exact semantic reference edges, incoming references to the
  missing capability IDs, and a diagnostic explanation that groups duplicate
  missing references by target.
- Source YAML inspection required: yes, especially for the two workflow files and
  `components/explorer_core.yaml`.
- Search behavior: helpful for specific targets like `validator` and `artifact`,
  noisy for broad terms like `workspace` and `diagnostic`.
- Would relationships/backlinks help? Yes. This model remains a strong internal
  proof that diagnostic UX and relationship/backlink UX should share a semantic
  reference index.
- Would diagrams help immediately? Somewhat, but less than references/backlinks.
  A generated workflow diagram could clarify Explorer's modeled review flows,
  but the active problem is missing-reference comprehension.
- Are document-style tabs now clearly needed? Yes. The Explorer model benefits
  from keeping the diagnostic list, source files, search results, and selected
  entities open together.

## Updated findings

### P1

1. **References/backlinks should be the next core UX capability.** All three
   canonical examples validate successfully, so the main friction is no longer
   loading or validation. The main friction is understanding semantic links across
   workflows, capabilities, events, components, roles, entities, and state
   machines without forcing users to read YAML and run repeated text searches.
2. **Diagnostic comprehension needs the same reference data.** The Explorer model
   still reports missing capabilities, and the UI cannot group the six diagnostics
   by missing target or show all referencing files without a semantic reference
   index.
3. **Browser validation is operationally blocked in this environment.** The smoke
   command is present, but Chromium is absent. Playwright browser download failed
   with HTTP 403 `Domain forbidden`, and no system Chromium executable was found.
   This pass therefore cannot claim visual validation of the UI.

### P2

1. **Document-style tabs are now clearly justified for realistic protocol
   review.** OAuth and WHIP require comparing several workflows, source views,
   entities, and search results. The current default Overview/Source/Diagram tabs
   reserve useful space, but users need entity/source/search/diagnostic tabs that
   behave like review documents.
2. **Search is useful as a fallback but noisy as the primary navigation tool.** It
   works for precise terms such as `handshake`, `transport`, `validator`, or
   `artifact`, but common protocol terms quickly produce dozens of source and
   entity matches.
3. **Built-in example loading should remain canonical and non-vendored, but dogfood
   should record the exact upstream source state.** The current main-branch ZIP
   path is useful for freshness. For reproducible evaluations, future dogfood
   reports should record commit SHA or artifact metadata when that data is
   exposed by the loading path.

### P3

1. **Diagrams are justified, but they should follow semantic data and generator
   artifacts.** The examples now show concrete diagram demand, especially for
   workflows, state machines, role interactions, and event flows. Explorer should
   not implement Explorer-owned YAML parsing or diagram generation to satisfy
   this.
2. **Vocabulary mismatch can make search feel incomplete.** WHIP search for
   `publish` found little even though the example is conceptually about WHIP
   publishing/ingest. Better semantic labels, aliases, or generated summaries
   would help, but should come from shared semantic data rather than ad hoc UI
   parsing.
3. **Small models still benefit from the current path-derived explorer.** QUIC is
   navigable enough to use the current UI outline, so the existing vertical slice
   remains a valid base.

## Roadmap implications

1. **Should references/backlinks come before diagrams?** Yes. References and
   backlinks should come before diagrams because every useful diagram identified
   in this pass depends on reliable semantic edges. The required data should come
   from Validator or a shared semantic index, not ad hoc parsing in Explorer.
2. **Should document-style tabs come before diagrams?** Yes, or at least ship in
   the same pre-diagram phase. OAuth and WHIP require side-by-side review of
   multiple workflows, capabilities, events, source files, search results, and
   diagnostics before diagrams are available.
3. **Are diagrams now justified, and if so for which entity types first?** Yes.
   Diagrams are justified for workflow step flows first, then state machines,
   then role/component interaction diagrams and event-flow diagrams. These should
   eventually come from BehavioML/generator as SDK data or generated artifacts,
   not Explorer-specific diagram generation.
4. **Does Explorer need more Validator semantic index data before meaningful UX
   improvements?** Yes for the highest-value improvements. Explorer can improve
   shell mechanics such as tabs without new semantic data, but references,
   backlinks, diagnostic grouping by missing target, semantic summaries, and
   trustworthy diagrams need Validator/shared-index data.
5. **What should be implemented next?** Implement a read-only references/backlinks
   integration fed by Validator or a shared semantic index, with no Explorer-owned
   YAML parsing and no duplicated generator logic. The first UI should expose
   outgoing references and incoming backlinks for selected workflows,
   capabilities, events, entities, components, and state machines, and reuse that
   same data to group missing-reference diagnostics. Document-style entity/source
   tabs should be the next shell improvement after, or alongside, that semantic
   reference panel. Diagram rendering should wait until generator-provided SDK
   data or artifacts are available.
