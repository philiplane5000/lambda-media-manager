/**
 * Normalizes a directory prefix string by removing leading/trailing slashes and whitespace
 * @param {string} rawPrefix - The raw prefix string to normalize (e.g., '/folder/', '  folder  ', '///folder///')
 * @returns {string} Normalized prefix with single trailing slash if prefix exists (e.g., 'folder/') or empty string
 */
const normalizePrefix = rawPrefix => {
    if (!rawPrefix) return '';
    const cleanPrefix = rawPrefix.trim().replace(/^\/+|\/+$/g, '');
    return cleanPrefix ? `${cleanPrefix}/` : '';
};

export default normalizePrefix;
