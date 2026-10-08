/**
 * zod helpers for the admin dialogs' number inputs, which react-hook-form
 * holds as strings (an empty <input type="number"> is "", not 0).
 */

import { z } from "zod";

function isInRange(n: number, min: number, max: number): boolean {
  return !Number.isNaN(n) && n >= min && n <= max;
}

/** A numeric field that may be left blank. */
export function optionalNumberInRange(
  min: number,
  max: number,
  message: string,
) {
  return z
    .string()
    .trim()
    .refine((v) => v === "" || isInRange(Number(v), min, max), message);
}

/** A numeric field that must be filled in. */
export function requiredNumberInRange(
  min: number,
  max: number,
  message: string,
) {
  return z
    .string()
    .trim()
    .refine((v) => v !== "" && isInRange(Number(v), min, max), message);
}
