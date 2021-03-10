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

export class AnimateLinear {
  private from: number[] = [];
  private step: number[] = [];
  private to: number[] = [];
  private onComplete: { (): void } = () => {};
  private isCompleted: boolean = false;
  constructor(
    from: number[],
    to: number[],
    duration: number,
    onComplete?: { (): void }
  ) {
    this.from = from;
    this.to = to;
    const diff: number[] = [to[0] - this.from[0], to[1] - this.from[1]];
    this.step = [diff[0] / duration, diff[1] / duration];
    if (onComplete) {
      this.onComplete = onComplete;
    }
  }
  update(deltaTime: number) {
    if (this.isCompleted) {
      return;
    }
    this.from[0] = this.from[0] + this.step[0] * deltaTime;
    this.from[1] = this.from[1] + this.step[1] * deltaTime;
    if (this.from[0] > this.to[0]) {
      this.from[0] = this.to[0];
    }
    if (this.from[1] > this.to[1]) {
      this.from[1] = this.to[1];
    }
    if (this.from[1] === this.to[1] && this.from[0] === this.to[0]) {
      this.isCompleted = true;
      this.onComplete();
    }
  }
  getPos(): ReadonlyArray<number> {
    return this.from;
  }
}

export class AnimateCurve extends AnimateLinear {
  private radius: number;
  constructor(radius: number, duration: number) {
    super([0, 0], [180, 0], duration);
    this.radius = radius;
  }
  getPos(): ReadonlyArray<number> {
    const [deg] = super.getPos();
    const rad = deg2rad(deg);
    const x = Math.sin(rad) * this.radius;
    const y = Math.cos(rad) * this.radius;

    return [Math.floor(x), Math.floor(y)];
  }
}

export const deg2rad = (deg: number): number => {
  return (Math.PI / 180) * deg;
};

export const rad2deg = (rad: number): number => {
  return (rad / Math.PI) * 180;
};
