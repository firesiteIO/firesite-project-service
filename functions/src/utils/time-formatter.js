/**
 * @fileoverview Time formatting utilities
 * @module utils/time-formatter
 */

/**
 * Formats a date to US Central Time (UTC-6)
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string in US Central Time
 */
function formatTimeUTC6(date) {
  if (!date) return "";

  // Create formatter for US Central Time
  const options = {
    timeZone: "America/Chicago", // US Central Time (UTC-6)
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  // Format the date using the US Central Time formatter
  return new Intl.DateTimeFormat("en-US", options).format(date);
}

module.exports = {
  formatTimeUTC6,
};
