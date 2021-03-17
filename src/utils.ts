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
  private compute: number[] = [];
  constructor(
    from: number[],
    to: number[],
    duration: number,
    onComplete?: { (): void }
  ) {
    const diff: number[] = [];
    this.from = from;
    this.to = to;
    this.compute = [];
    if (to[0] > from[0]) {
      this.compute.push(1);
      diff.push(to[0] - this.from[0]);
    } else if (to[0] < from[0]) {
      this.compute.push(-1);
      diff.push(from[0] - to[0]);
    } else {
      this.compute.push(0);
      diff.push(0);
    }
    if (to[1] > from[1]) {
      this.compute.push(1);
      diff.push(to[1] - this.from[1]);
    } else if (to[1] < from[1]) {
      this.compute.push(-1);
      diff.push(from[1] - to[1]);
    } else {
      this.compute.push(0);
      diff.push(0);
    }

    this.step = [diff[0] / duration, diff[1] / duration];
    if (onComplete) {
      this.onComplete = onComplete;
    }
  }
  update(deltaTime: number) {
    if (this.isCompleted) {
      return;
    }

    this.from[0] = this.from[0] + this.step[0] * this.compute[0] * deltaTime;
    this.from[1] = this.from[1] + this.step[1] * this.compute[1] * deltaTime;

    if (
      (this.from[0] > this.to[0] && this.compute[0] > 0) ||
      (this.from[0] < this.to[0] && this.compute[0] < 0)
    ) {
      this.from[0] = this.to[0];
    }
    if (
      (this.from[1] > this.to[1] && this.compute[1] > 0) ||
      (this.from[1] < this.to[1] && this.compute[1] < 0)
    ) {
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
  getIsCompleted(): boolean {
    return this.isCompleted;
  }
}

export class AnimateCurve extends AnimateLinear {
  private radius: number;
  readonly direction: string;
  constructor(direction: string, radius: number, duration: number) {
    if (direction === 'left') {
      super([0, 0], [180, 0], duration);
    } else if (direction === 'right') {
      super([180, 0], [360, 0], duration);
    } else if (direction === 'top') {
      super([90, 0], [270, 0], duration);
    } else {
      super([270, 0], [450, 0], duration);
    }

    this.direction = direction;
    this.radius = radius;
  }
  getPos(): ReadonlyArray<number> {
    const [deg] = super.getPos();
    const rad = deg2rad(deg);
    const x = Math.cos(rad) * this.radius;
    const y = Math.sin(rad) * this.radius;
    return [Math.floor(x), Math.floor(y)];
  }
}

export const deg2rad = (deg: number): number => {
  return (Math.PI / 180) * deg;
};

export const rad2deg = (rad: number): number => {
  return (rad / Math.PI) * 180;
};
