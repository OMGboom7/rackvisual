import { describe, it, expect } from 'vitest';
import { worldYToSlot, slotY, U_HEIGHT } from '../rack-geometry';

describe('worldYToSlot', () => {
  const totalU = 42;
  const interiorH = totalU * U_HEIGHT;

  it('top of interior (worldY just below ceiling) maps to slot 1', () => {
    expect(worldYToSlot(interiorH / 2 - 0.001, totalU, 1)).toBe(1);
  });

  it('is the inverse of slotY for 1U components', () => {
    for (let slot = 1; slot <= totalU; slot++) {
      const y = slotY(slot, totalU, 1);
      expect(worldYToSlot(y, totalU, 1)).toBe(slot);
    }
  });

  it('clamps to slot 1 when worldY is above rack interior', () => {
    expect(worldYToSlot(999, totalU, 1)).toBe(1);
  });

  it('clamps to totalU when worldY is below interior for 1U', () => {
    expect(worldYToSlot(-999, totalU, 1)).toBe(totalU);
  });

  it('clamps to totalU - heightU + 1 for multi-U components', () => {
    expect(worldYToSlot(-999, totalU, 2)).toBe(totalU - 1);
    expect(worldYToSlot(-999, totalU, 4)).toBe(totalU - 3);
  });

  it('cursor at top of row 5 maps to slot 5', () => {
    const topOfRow5 = interiorH / 2 - 4 * U_HEIGHT - 0.001;
    expect(worldYToSlot(topOfRow5, totalU, 1)).toBe(5);
  });

  it('cursor at bottom of row 5 maps to slot 5 (not 6)', () => {
    const bottomOfRow5 = interiorH / 2 - 5 * U_HEIGHT + 0.001;
    expect(worldYToSlot(bottomOfRow5, totalU, 1)).toBe(5);
  });
});
