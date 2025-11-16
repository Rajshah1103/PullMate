// src/errorHandler.js
import { getLogger } from './logger.js';

export class PullMateError extends Error {
  constructor(message, code = 'PULLMATE_ERROR', details = {}) {
    super(message);
    this.name = 'PullMateError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class GitError extends PullMateError {
  constructor(message, gitCommand, exitCode, stderr) {
    super(message, 'GIT_ERROR', { gitCommand, exitCode, stderr });
  }
}

export class ConfigError extends PullMateError {
  constructor(message, configPath) {
    super(message, 'CONFIG_ERROR', { configPath });
  }
}

export class ScheduleError extends PullMateError {
  constructor(message, schedule) {
    super(message, 'SCHEDULE_ERROR', { schedule });
  }
}

export class ErrorHandler {
  constructor(logger) {
    this.logger = logger || getLogger();
    this.setupGlobalHandlers();
  }

  setupGlobalHandlers() {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception', error);
      this.gracefulShutdown(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Promise Rejection', new Error(reason), {
        promise: promise.toString()
      });
      this.gracefulShutdown(1);
    });

    // Handle SIGTERM (graceful shutdown)
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, initiating graceful shutdown');
      this.gracefulShutdown(0);
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, initiating graceful shutdown');
      this.gracefulShutdown(0);
    });
  }

  /**
   * Handle git command errors
   */
  handleGitError(error, command, repoPath) {
    const gitError = new GitError(
      `Git command failed: ${command}`,
      command,
      error.status || -1,
      error.stderr || error.message
    );
    
    this.logger.error(`Git operation failed in ${repoPath}`, gitError);
    return gitError;
  }

  /**
   * Handle configuration errors
   */
  handleConfigError(error, configPath) {
    const configError = new ConfigError(
      `Configuration error: ${error.message}`,
      configPath
    );
    
    this.logger.error('Configuration error', configError);
    return configError;
  }

  /**
   * Handle schedule errors
   */
  handleScheduleError(error, schedule) {
    const scheduleError = new ScheduleError(
      `Schedule error: ${error.message}`,
      schedule
    );
    
    this.logger.error('Schedule error', scheduleError);
    return scheduleError;
  }

  /**
   * Wrap async functions with error handling
   */
  wrapAsync(fn) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.logger.error(`Error in ${fn.name}`, error);
        throw error;
      }
    };
  }

  /**
   * Wrap sync functions with error handling
   */
  wrapSync(fn) {
    return (...args) => {
      try {
        return fn(...args);
      } catch (error) {
        this.logger.error(`Error in ${fn.name}`, error);
        throw error;
      }
    };
  }

  /**
   * Retry function with exponential backoff
   */
  async retry(fn, options = {}) {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffFactor = 2
    } = options;

    let lastError;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          this.logger.error(`Function failed after ${maxAttempts} attempts`, error);
          throw error;
        }

        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );
        
        this.logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, error);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Sleep utility for retry logic
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Graceful shutdown
   */
  gracefulShutdown(exitCode = 0) {
    this.logger.info('Initiating graceful shutdown...');
    
    // Give some time for cleanup
    setTimeout(() => {
      this.logger.info('Graceful shutdown completed');
      process.exit(exitCode);
    }, 1000);
  }

  /**
   * Validate and sanitize user input
   */
  validateInput(input, type, fieldName) {
    switch (type) {
      case 'path':
        if (typeof input !== 'string' || input.trim() === '') {
          throw new PullMateError(`Invalid path for ${fieldName}: must be a non-empty string`);
        }
        return input.trim();
        
      case 'time':
        if (typeof input !== 'string' || !/^\d{1,2}:\d{2}$/.test(input)) {
          throw new PullMateError(`Invalid time format for ${fieldName}: must be HH:MM`);
        }
        const [hour, minute] = input.split(':').map(Number);
        if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
          throw new PullMateError(`Invalid time for ${fieldName}: hour must be 0-23, minute must be 0-59`);
        }
        return input;
        
      case 'boolean':
        if (typeof input !== 'boolean') {
          throw new PullMateError(`Invalid boolean for ${fieldName}: must be true or false`);
        }
        return input;
        
      default:
        return input;
    }
  }

  /**
   * Create a safe wrapper for external commands
   */
  safeExec(command, options = {}) {
    return new Promise((resolve, reject) => {
      const { execSync } = require('child_process');
      
      try {
        const result = execSync(command, {
          encoding: 'utf-8',
          timeout: options.timeout || 30000,
          ...options
        });
        resolve(result);
      } catch (error) {
        const safeError = new PullMateError(
          `Command execution failed: ${command}`,
          'EXEC_ERROR',
          {
            command,
            exitCode: error.status,
            stderr: error.stderr,
            stdout: error.stdout
          }
        );
        reject(safeError);
      }
    });
  }
}
