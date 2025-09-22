// A simple logger that wraps the console and adds a timestamp and log level.
// This can be easily extended later to write to a file.

const getTimestamp = (): string => new Date().toISOString();

export const logger = {
  /**
   * Logs an informational message.
   * @param message The primary message to log.
   * @param optionalParams Additional objects or values to log.
   */
  info: (message: string, ...optionalParams: unknown[]): void => {
    console.log(`${getTimestamp()} [INFO] ${message}`, ...optionalParams);
  },

  /**
   * Logs a warning message.
   * @param message The primary message to log.
   * @param optionalParams Additional objects or values to log.
   */
  warn: (message: string, ...optionalParams: unknown[]): void => {
    console.warn(`${getTimestamp()} [WARN] ${message}`, ...optionalParams);
  },

  /**
   * Logs an error message.
   * @param message The primary message to log.
   * @param optionalParams Additional objects, including Error objects.
   */
  error: (message: string, ...optionalParams: unknown[]): void => {
    console.error(`${getTimestamp()} [ERROR] ${message}`, ...optionalParams);
  },
};
