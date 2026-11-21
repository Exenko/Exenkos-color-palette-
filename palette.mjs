/* ES module wrapper around palette.js, which is a classic script so it can also
 * be dropped into a page with <script src="palette.js"></script>. */
import './palette.js';

const ReliefPalette = globalThis.ReliefPalette;
export const { build, batch, toCss, toJson, cssBlock, STRATEGIES, ORDER, DEFAULTS, util } = ReliefPalette;
export default ReliefPalette;
