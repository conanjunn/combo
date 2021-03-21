import { px } from './utils/unit';
import { Balls } from './balls';
import { Engine } from './engine';
import { Player } from './player';
import EventEmitter from 'eventemitter3';

export class World {
  readonly engine: Engine;
  readonly event: Readonly<EventEmitter> = new EventEmitter();
  readonly canvas: HTMLCanvasElement = <HTMLCanvasElement>(
    document.getElementById('cvs')
  );
  readonly ctx: CanvasRenderingContext2D = <CanvasRenderingContext2D>(
    this.canvas.getContext('2d')
  );
  constructor() {
    this.canvas.width = document.body.clientWidth;
    this.canvas.height = document.body.clientHeight;
    px.init(this.canvas);

    this.engine = new Engine(this);
    const balls = new Balls(this);
    new Player(this, balls);
  }
}
