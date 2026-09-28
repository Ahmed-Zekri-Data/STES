import { describe, it, expect } from 'vitest';
import { CAMERA_KEYS, keyOffsets, segmentAt, beatAt, lensLayout, qualityFor, SECTIONS } from './story';

// Every section 1000 px tall, one after the other
const layout = (name) => ({ top: SECTIONS.indexOf(name) * 1000, height: 1000 });

describe('the home page story', () => {
  it('places each camera key where its section is scrolled to', () => {
    const offsets = keyOffsets(layout, 800);
    expect(offsets[0]).toBe(0);
    expect(offsets[1]).toBe(1000 + 0.2 * 1000); // 20 % into "goggles"
    // The last key: the contact section's bottom at the bottom of the screen
    expect(offsets.at(-1)).toBe(SECTIONS.indexOf('contact') * 1000 + 1000 - 800);
    // In story order
    expect([...offsets].sort((a, b) => a - b)).toEqual(offsets);
    expect(offsets).toHaveLength(CAMERA_KEYS.length);
  });

  it('moves the camera between the two keys around the scroll position, eased', () => {
    const offsets = [0, 100, 300];
    expect(segmentAt(offsets, 0)).toEqual({ from: 0, to: 1, t: 0 });
    expect(segmentAt(offsets, 50)).toEqual({ from: 0, to: 1, t: 0.5 });
    expect(segmentAt(offsets, 125).from).toBe(1);
    expect(segmentAt(offsets, 125).t).toBeLessThan(0.125); // slow start
    expect(segmentAt(offsets, 900)).toEqual({ from: 1, to: 2, t: 1 });
  });

  it('counts down 3, 2, 1 on the starting block, and says nothing in between', () => {
    const ready = layout('ready').top;
    expect(beatAt(layout, ready + 100).beat.text).toBe('3');
    expect(beatAt(layout, ready + 500).beat.text).toBe('2');
    expect(beatAt(layout, ready + 800).beat.text).toBe('1');
    expect(beatAt(layout, layout('boutique').top + 500)).toBeNull();
    // Words fade in and out rather than jumping
    expect(beatAt(layout, ready + 1).opacity).toBeLessThan(0.1);
  });

  it('shows two lenses on wide screens and a diving mask on phones', () => {
    expect(lensLayout(1440, 900).mode).toBe(0);
    const phone = lensLayout(390, 844);
    expect(phone.mode).toBe(1);
    expect(phone.rx).toBeLessThan(0.5);
  });

  it('asks less of phones', () => {
    const phone = qualityFor({ width: 390, pixelRatio: 3 });
    const desktop = qualityFor({ width: 1440, pixelRatio: 2 });
    expect(phone.small).toBe(true);
    expect(phone.pixelRatio).toBeLessThan(desktop.pixelRatio);
    expect(phone.grass).toBeLessThan(desktop.grass);
    expect(phone.models).toBe(false);
    expect(qualityFor({ width: 1440, memory: 2 }).small).toBe(true);
  });
});
