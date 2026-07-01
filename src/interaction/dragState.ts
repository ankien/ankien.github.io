/**
 * Tiny shared flag so the camera pan controller can tell when a desk prop is
 * actively being grabbed. While `grabbing > 0`, a touch drag belongs to that
 * object and must NOT pan the viewport. It's a plain module-level object (not
 * React state) so reads/writes are synchronous and allocation-free inside
 * pointer handlers.
 */
export const dragState = { grabbing: 0 };
