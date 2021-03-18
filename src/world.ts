import { px } from './utils/unit';

export class World {
  constructor() {
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;
    px.init(this.canvas);
  }
  readonly canvas: HTMLCanvasElement = <HTMLCanvasElement>(
    document.getElementById('cvs')
  );
  readonly ctx: CanvasRenderingContext2D = <CanvasRenderingContext2D>(
    this.canvas.getContext('2d')
  );
}

export const world = new World();
