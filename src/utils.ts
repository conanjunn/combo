import seedrandom from 'seedrandom';

export const throttle = (max: number, callback: () => void) => {
  let counter = 0;
  return (amount: number) => {
    counter += amount;
    if (counter >= max) {
      callback();
      counter = 0;
    }
  };
};

export class SeedRandom {
  constructor(seed: string) {
    this.ran = seedrandom(seed);
  }

  private ran: seedrandom.prng;
  random(min: number, max: number): number {
    return min + Math.floor(this.ran() * (max - min + 1));
  }
  randomMulti(min: number, max: number, count: number) {
    const ret = [];
    for (let index = 0; index < count; index++) {
      ret.push(this.random(min, max));
    }
    return ret;
  }
}

class UnitPx {
  constructor() {}
  private maxWidth: number = 0;
  init(canvas: HTMLCanvasElement) {
    this.maxWidth = canvas.width;
  }
  toPx(px: number) {
    const preW = this.maxWidth / 100;
    return Math.floor((px / 7.5) * preW);
  }
}

export const px = new UnitPx();

export class Animate {
  private duration: number = 0;
  private from: number[] = [];
  private to: number[] = [];
  private timeCounter: number = 0;
  private diff: number = 0;
  private step: number = 0;
  constructor(from: number[], to: number[], duration: number) {
    this.duration = duration;
    this.from = from;
    this.to = to;
    // this.diff = to - from;
    this.step = this.diff / this.duration;
  }
  update(deltaTime: number) {
    // this.from += this.step * deltaTime
  }
}
