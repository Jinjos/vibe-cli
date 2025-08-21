/**
 * Shared logging utility for conditional output based on mode
 */

/**
 * Create a logger that conditionally outputs based on mcpMode
 * @param {Object} options - Configuration options
 * @param {boolean} options.mcpMode - Whether in MCP mode (suppresses output)
 * @returns {Function} Logger function
 */
function Logger(options = {}) {
    const { mcpMode } = options;
  
  if (mcpMode) {
    // Return a silent function
    const silent = () => {};
    silent.log = () => {};
    silent.warn = () => {};
    silent.error = () => {};
    return silent;
  }
  
  // Return the actual logger functions
  const logger = (...args) => console.log(...args);
  logger.log = (...args) => console.log(...args);
  logger.warn = (...args) => console.warn(...args);
  logger.error = (...args) => console.error(...args);
  
  return logger;
}

module.exports = { Logger };