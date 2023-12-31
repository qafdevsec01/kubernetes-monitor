import { spawn, SpawnPromiseResult } from 'child-process-promise';
import { logger } from './logger';
import { config } from './config';

export interface IProcessArgument {
  body: string;
  sanitise: boolean;
}

export function exec(
  bin: string,
  env: Record<string, string | undefined>,
  ...processArgs: IProcessArgument[]
): Promise<SpawnPromiseResult> {
  if (process.env.DEBUG === 'true') {
    processArgs.push({ body: '--debug', sanitise: false });
  }

  // Ensure we're not passing the whole environment to the shelled out process...
  // For example, that process doesn't need to know secrets like our integrationId!
  const combinedEnv = {
    ...env,
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    HTTPS_PROXY: config.HTTPS_PROXY,
    HTTP_PROXY: config.HTTP_PROXY,
    NO_PROXY: config.NO_PROXY,
  };

  const allArguments = processArgs.map((arg) => arg.body);
  return spawn(bin, allArguments, {
    env: combinedEnv,
    capture: ['stdout', 'stderr'],
  }).catch((error) => {
    const message =
      error?.stderr || error?.stdout || error?.message || 'Unknown reason';
    const loggableArguments = processArgs
      .filter((arg) => !arg.sanitise)
      .map((arg) => arg.body);
    logger.warn({ message, bin, loggableArguments }, 'child process failure');
    throw error;
  });
}
