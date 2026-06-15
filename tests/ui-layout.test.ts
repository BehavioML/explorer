import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const appSource = readFileSync('src/ui-react/App.tsx', 'utf8');
const stylesSource = readFileSync('src/ui-react/styles.css', 'utf8');

test('renders selected entity, diagnostic context, and source panel in right-column document flow', () => {
  const detailStackMatch = appSource.match(
    /<div className="entity-detail-stack">[\s\S]*?<\/div>\n\s*<\/div>\n\s*\) : \(/,
  );

  assert.ok(detailStackMatch, 'expected populated entity detail stack markup');

  const detailStack = detailStackMatch[0];
  const selectedEntityIndex = detailStack.indexOf('<SelectedEntitySummary');
  const diagnosticContextIndex = detailStack.indexOf('<SelectedDiagnosticContext');
  const sourcePanelIndex = detailStack.indexOf('<SourcePanel');

  assert.notEqual(selectedEntityIndex, -1, 'expected selected entity summary in detail stack');
  assert.notEqual(diagnosticContextIndex, -1, 'expected diagnostic context in detail stack');
  assert.notEqual(sourcePanelIndex, -1, 'expected source panel in detail stack');
  assert.ok(
    selectedEntityIndex < diagnosticContextIndex && diagnosticContextIndex < sourcePanelIndex,
    'expected selected entity, diagnostic context, and source panel to render in vertical order',
  );
});

test('keeps entity detail cards in non-overlapping vertical flow', () => {
  assert.match(
    stylesSource,
    /\.entity-detail-stack\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*1rem;[^}]*}/s,
  );

  const entitySummaryRule = stylesSource.match(/\.entity-summary\s*{(?<body>[^}]*)}/)?.groups?.body;

  assert.ok(entitySummaryRule, 'expected entity-summary style rule');
  assert.doesNotMatch(entitySummaryRule, /position:\s*(absolute|sticky|fixed)\b/);
});

test('contains source layout safeguards for long paths and large files', () => {
  assert.match(
    stylesSource,
    /\.source-panel\s*{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow:\s*hidden;[^}]*}/s,
  );
  assert.match(
    stylesSource,
    /\.source-code\s*{[^}]*max-width:\s*100%;[^}]*max-height:\s*32rem;[^}]*overflow:\s*auto;[^}]*}/s,
  );
  assert.match(
    stylesSource,
    /\.source-code code\s*{[^}]*min-width:\s*max-content;[^}]*white-space:\s*pre;[^}]*}/s,
  );
  assert.match(
    stylesSource,
    /\.source-metadata-list code,[\s\S]*?\.selected-diagnostic-list code,[\s\S]*?\.missing-source code\s*{[^}]*overflow-wrap:\s*anywhere;[^}]*}/s,
  );
});


test('workflow browsing is consolidated into the entity list and actions move to the inspector', () => {
  assert.match(appSource, /function DiagramsActivityPanel/);
  assert.match(appSource, /function CompactEntityRowButton/);
  assert.match(appSource, /function InspectorActions/);
  assert.match(appSource, /Open diagrams/);
  assert.match(appSource, /Explore workflows/);
  assert.match(appSource, /Show map/);
  assert.match(appSource, /View diagnostics/);
  assert.match(appSource, /Refresh workspace/);
  assert.match(appSource, /className="compact-entity-list"/);
  assert.match(appSource, /className="entity-button"/);
  assert.doesNotMatch(appSource, /className="compact-entity-list diagram-workflow-list"/);
  assert.doesNotMatch(appSource, /className="diagram-workflow-button"/);
  assert.doesNotMatch(appSource, /Load example/);
  assert.doesNotMatch(appSource, /ExampleLoader/);
});


test('keeps workspace document and entity view tab strips visible in the workbench', () => {
  assert.match(appSource, /<div className="workspace-tab-strip" role="tablist" aria-label="Workspace documents">/);
  assert.match(appSource, /documents\.map\(\(document\) =>/);
  assert.match(appSource, /<div className="entity-view-tab-strip" role="tablist" aria-label="Entity document views">/);
  assert.match(appSource, /\{ id: 'source', label: 'Source' \}/);
  assert.match(appSource, /\{ id: 'relationships', label: 'Relationships' \}/);
  assert.match(appSource, /\{ id: 'diagram', label: 'Diagram' \}/);

  assert.match(
    stylesSource,
    /\.workspace-area\s*{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*(?:39|34)px\s+minmax\(0,\s*1fr\);[^}]*}/s,
  );
  assert.match(stylesSource, /\.workspace-tab-strip\s*{[^}]*display:\s*flex;[^}]*}/s);
  assert.match(
    stylesSource,
    /\.entity-document-workspace\s*{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*(?:35|30)px\s+minmax\(0,\s*1fr\);[^}]*}/s,
  );
  assert.match(stylesSource, /\.entity-view-tab-strip\s*{[^}]*display:\s*flex;[^}]*}/s);
  assert.doesNotMatch(stylesSource, /\.workspace-tab-strip,\s*\.entity-view-tab-strip\s*{[^}]*display:\s*none;[^}]*}/s);
  assert.doesNotMatch(stylesSource, /\.workspace-area,\s*\.entity-document-workspace\s*{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);[^}]*}/s);
});
