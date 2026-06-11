/** Shared config for the demo "Try your own product" free-trial limit (enforced via IP in Redis AND localStorage). */
export const DEMO_OWN_TRYON_LIMIT = 3;

/** localStorage key holding how many own-product try-ons this browser has consumed. */
export const DEMO_OWN_TRYON_LS_KEY = "fit-room_demo_own_tryons_used";

export type DemoOwnTryOnLimitResponse = {
  used: number;
  remaining: number;
  limit: number;
};
