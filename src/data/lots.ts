import lotsData from "@/src/data/lots.json";
import type { Lot } from "@/src/types/lot";

/** DEV-ONLY demo catalog. Never a production source: the storefront's
 *  catalog comes from Admin (src/lib/store/catalog.ts), which uses this only
 *  when Admin is unconfigured and NODE_ENV is not "production". */
export const LOTS: Lot[] = lotsData as Lot[];
