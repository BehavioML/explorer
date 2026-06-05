# Explorer dogfood evaluation

Date: 2026-06-05

## Scope and method

This evaluation intentionally does **not** implement features. It dogfoods the current Explorer slice and the Explorer BehavioML model to identify product and architecture friction before proposing new Explorer functionality.

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

The current implementation is accurately framed as a first vertical slice: archive upload, root detection, validation, path-based overview, scope-oriented entity browsing, path/text search, diagnostics, workspace tabs, and raw read-only source viewing are implemented; remote fetch, semantic navigation, line highlighting, semantic field navigation, reference/backlink resolution, generated/supporting artifact discovery, diagram rendering, editing, and Explorer-owned BehavioML semantics are intentionally deferred.

Loading the Explorer model itself produced:

- model root: `specs/001-model-explorer/behavioml-draft/model/`
- extracted validation files: 81
- path-derived entities: 81
- validation result: failed with 6 error diagnostics for missing `workspace/discover_generated_artifacts` and `workspace/discover_supporting_artifacts` references.

The repository-level `behavioml/` package was rejected with `workspace_root_not_found` because it contains no populated model-scope directories.

## P1 findings

### P1.1 Requested example workspaces are not available or discoverable

The highest-priority blocker is not a UI control but the absence of the requested dogfood targets. `examples/quic`, `examples/oauth-authorization-code`, and `examples/whip` are not in this checkout, so a user cannot reproduce the intended Explorer evaluation without out-of-band knowledge of where those examples live.

Impact:

- Explorer quality cannot be validated against realistic protocol-sized models from this repository alone.
- Future feature proposals risk being biased toward the Explorer model, which is meta-model-shaped and may not expose the same navigation needs as QUIC/OAuth/WHIP domain models.
- The repository currently has no committed fixture or documented archive-production workflow for canonical examples.

Missing information:

- Where canonical BehavioML example models are hosted.
- Whether examples should be loaded as directories, local archives, GitHub ZIPs, or remote archive URLs.
- Expected validation health for each example.
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

1. **Commit canonical example fixtures or documented fixture sources.** Add or document `examples/quic`, `examples/oauth-authorization-code`, and `examples/whip`, including expected archive commands and validation health. This should happen before adding more UI features.
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
