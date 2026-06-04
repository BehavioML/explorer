import type { LoadedWorkspaceInput } from './workspace';
import type { ValidationResultViewModel } from './diagnostics';

export interface ValidateWorkspaceCommand {
  readonly type: 'validate_workspace';
  readonly workspace: LoadedWorkspaceInput;
}

export interface ValidatorPort {
  validateWorkspace(workspace: LoadedWorkspaceInput): Promise<ValidationResultViewModel>;
}
