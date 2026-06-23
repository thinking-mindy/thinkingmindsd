/**
 * Recursively converts MongoDB ObjectIds and Dates to strings for Next.js serialization
 * This is required because ObjectIds have toJSON methods and can't be passed to Client Components
 * 
 * Client-safe version that doesn't import MongoDB
 */

// Type guard to check if an object looks like a MongoDB ObjectId
function isObjectIdLike(obj: any): obj is { toHexString: () => string } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.toHexString === 'function' &&
    obj.toHexString.length === 0 // ObjectId#toHexString takes no args
  );
}

export function serializeObjectIds<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle ObjectId-like objects
  if (isObjectIdLike(obj)) {
    return obj.toHexString() as unknown as T;
  }

  // Handle Date
  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeObjectIds(item)) as unknown as T;
  }

  // Handle objects
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = (obj as any)[key];
        
        if (isObjectIdLike(value)) {
          serialized[key] = value.toHexString();
        } else if (value instanceof Date) {
          serialized[key] = value.toISOString();
        } else if (Array.isArray(value)) {
          serialized[key] = value.map(item => serializeObjectIds(item));
        } else if (value !== null && typeof value === 'object') {
          serialized[key] = serializeObjectIds(value);
        } else {
          serialized[key] = value;
        }
      }
    }
    return serialized as T;
  }

  // Return primitives as-is
  return obj;
}
