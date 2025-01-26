/**
 * Filters S3 objects based on storage class and size
 * @param {Object} object - S3 object metadata
 * @param {number} object.Size - Object size in bytes
 * @param {string} object.StorageClass - S3 storage class
 * @returns {boolean} Whether the object passes all filters
 */
const filterObjects = ({ Size, StorageClass }) => {
    return StorageClass === 'STANDARD' && parseInt(Size) > 0;
};

export default filterObjects;
