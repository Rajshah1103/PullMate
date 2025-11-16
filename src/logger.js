// src/logger.js
import winston from 'winston';
import path from 'path';
import os from 'os';
import fs from 'fs';

const DEFAULT_LOG_DIR = path.join(os.homedir(), '.pullmate');
const DEFAULT_LOG_FILE = path.join(DEFAULT_LOG_DIR, 'logs.txt');

class Logger {
  constructor(logFilePath = DEFAULT_LOG_FILE, logLevel = 'info') {
    this.logFilePath = logFilePath;
    this.ensureLogDirectory();
    
    // Create Winston logger instance
    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(({ timestamp, level, message, stack }) => {
          const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
          return stack ? `${logMessage}\n${stack}` : logMessage;
        })
      ),
      transports: [
        // File transport for persistent logging
        new winston.transports.File({
          filename: this.logFilePath,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          tailable: true
        })
      ],
      // Handle uncaught exceptions
      exceptionHandlers: [
        new winston.transports.File({ 
          filename: path.join(path.dirname(this.logFilePath), 'exceptions.log') 
        })
      ],
      rejectionHandlers: [
        new winston.transports.File({ 
          filename: path.join(path.dirname(this.logFilePath), 'rejections.log') 
        })
      ]
    });

    // Add console transport in development or if DEBUG is set
    if (process.env.NODE_ENV !== 'production' || process.env.DEBUG) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }
  }

  ensureLogDirectory() {
    try {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to create log directory:', error.message);
    }
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, error = null, meta = {}) {
    const errorMeta = error ? { error: error.message, stack: error.stack, ...meta } : meta;
    this.logger.error(message, errorMeta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // Specialized methods for PullMate
  logRepoOperation(operation, repoData) {
    const logEntry = [
      `📁 Repo: ${repoData.repoName} (${repoData.repoPath})`,
      `🌿 Branch: ${repoData.branch || 'unknown'}`,
      `📊 Status: ${repoData.status}`,
      `⏰ Time: ${repoData.timestamp}`,
      `📝 Details: ${repoData.message}`,
      '---'
    ].join('\n');
    
    this.info(logEntry);
  }

  logSummary(summary) {
    const summaryText = `✅ ${summary.updated} updated | 🔄 ${summary.upToDate} up-to-date | ⚠️ ${summary.warnings} warnings | ❌ ${summary.failed} failed`;
    this.info(`\nPull operation summary: ${summaryText}`);
    this.info('======================================\n');
  }

  logStartup(operation) {
    this.info(`🚀 PullMate ${operation} started`);
  }

  logSchedule(schedule) {
    this.info(`⏰ Schedule set up: ${JSON.stringify(schedule)}`);
  }

  // Get recent logs (useful for debugging)
  async getRecentLogs(lines = 50) {
    try {
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      return content.split('\n').slice(-lines).join('\n');
    } catch (error) {
      this.error('Failed to read recent logs', error);
      return null;
    }
  }

  // Clean old logs
  async cleanOldLogs(daysToKeep = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const content = fs.readFileSync(this.logFilePath, 'utf-8');
      const lines = content.split('\n');
      
      const filteredLines = lines.filter(line => {
        const timestampMatch = line.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*?)\]/);
        if (!timestampMatch) return true; // Keep non-timestamped lines
        
        const logDate = new Date(timestampMatch[1]);
        return logDate >= cutoffDate;
      });
      
      fs.writeFileSync(this.logFilePath, filteredLines.join('\n'));
      this.info(`Cleaned logs older than ${daysToKeep} days`);
    } catch (error) {
      this.error('Failed to clean old logs', error);
    }
  }
}

// Default logger instance
let defaultLogger;

export function getLogger(logFilePath, logLevel) {
  if (!defaultLogger) {
    defaultLogger = new Logger(logFilePath, logLevel);
  }
  return defaultLogger;
}

export function createLogger(logFilePath, logLevel) {
  return new Logger(logFilePath, logLevel);
}

export { Logger };
