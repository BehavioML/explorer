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


test('diagrams activity renders a compact workflow list rather than the placeholder', () => {
  assert.match(appSource, /function DiagramsActivityPanel/);
  assert.match(appSource, /const workflows = index\.entities\.filter\(\(entity\) => entity\.scope === 'workflows'\)/);
  assert.match(appSource, /className=\{isSelected \? 'diagram-workflow-button diagram-workflow-button--selected' : 'diagram-workflow-button'\}/);
  assert.doesNotMatch(
    appSource,
    /title="Diagrams"\s+message="Open a workflow entity tab and select Diagram to lazily request/s,
  );
});
