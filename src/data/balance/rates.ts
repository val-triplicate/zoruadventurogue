/*
 * Rates for shinies and other random properties are defined in this file.
 * CHANCE is defined as x/65536
 * RATE is defined as 1/x
 */

// #region Encounterable properties

/** `64/65536 -> 1/1024` */
export const BASE_SHINY_CHANCE = 64;

/** `1 / 256` */
export const BASE_HIDDEN_ABILITY_RATE = 256;

// #endregion Encounterable properties

// #region Variant properties

// The chance x/10 of a shiny being a variant, then of being specifically an epic variant
export const SHINY_VARIANT_CHANCE = 4;
export const SHINY_EPIC_CHANCE = 1;

// The catch rate bonus for shiny mons, introduced in Z-A. Can be boosted in events.
export const SHINY_CATCH_RATE_MULTIPLIER = 2;

// #endregion Variant properties
