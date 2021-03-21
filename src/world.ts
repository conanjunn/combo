import { px } from './utils/unit';
import { Balls } from './balls';
import { Engine } from './engine';

export class World {
  readonly engine: Engine;
  constructor() {
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;
    px.init(this.canvas);

    this.engine = new Engine(this);
    new Balls(this);
  }
  readonly canvas: HTMLCanvasElement = <HTMLCanvasElement>(
    document.getElementById('cvs')
  );
  readonly ctx: CanvasRenderingContext2D = <CanvasRenderingContext2D>(
    this.canvas.getContext('2d')
  );
}
