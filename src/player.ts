import EventEmitter from 'eventemitter3';
import { Balls } from './balls';
import { eventType } from './values';
import { World } from './world';

export class Player {
  private balls: Balls;
  private attackCounter: number[] = [];
  private comboCounter: number = 0;
  private event: EventEmitter;
  constructor(world: World, balls: Balls) {
    this.balls = balls;
    this.event = world.event;
    this.event.addListener(eventType.remove, this.add, this);
    this.event.addListener(eventType.disabled, this.settle, this);
  }
  private add() {
    const removeList = this.balls.getRemoveList();
    this.comboCounter += removeList.length;
    removeList.forEach((list) => {
      list.forEach((item) => {
        if (!this.attackCounter[item.type]) {
          this.attackCounter[item.type] = 0;
        }
        this.attackCounter[item.type] += 1;
      });
    });
  }
  private settle() {
    console.log(this.attackCounter, this.comboCounter);
  }
}
