import { World } from './world';

export type Tick = { (deltaTime: number): void };

export class Engine {
  private world: World;
  constructor(world: World) {
    this.world = world;
  }
  private ticks: Tick[] = [];
  private prevTime: number = 0;
  runner() {
    requestAnimationFrame((time: number) => {
      const world = this.world;
      world.ctx.clearRect(0, 0, world.canvas.width, world.canvas.height);

      const deltaTime = (time - this.prevTime) / 1000;
      this.ticks.forEach((item: Tick) => {
        item(deltaTime);
      });
      this.prevTime = time;
      this.runner();
    });
  }
  addTick(handler: Tick) {
    this.ticks.push(handler);
  }
  removeTick(handler: Tick) {
    this.ticks = this.ticks.filter((item: Tick) => {
      return item !== handler;
    });
  }
}
