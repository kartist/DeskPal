import { Command } from '@tauri-apps/plugin-shell';

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  code: number | null;
  duration: number;
}

/** Execute command (wait for completion, return all output) */
export async function executeCommand(command: string): Promise<ExecutionResult> {
  const start = Date.now();
  const cmd = Command.create('cmd', ['/C', command]);
  const output = await cmd.execute();
  return {
    stdout: output.stdout,
    stderr: output.stderr,
    code: output.code,
    duration: Date.now() - start,
  };
}
