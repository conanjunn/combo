import { engine, Tick } from './engine';
import { px, SeedRandom } from './utils';
import { BallTypes, BallTypesOpacity } from './values';
import { world } from './world';

interface Ball {
  type: number;
  row: number;
  column: number;
  isComplete: boolean;
}

export class Balls {
  private arr: Ball[][] = [];
  private userSelected: number[] = [];
  private touchStartPos: number[] = [];
  private radius: number = px.toPx(750 / 6 / 2);
  private renderFn: Tick;

  constructor() {
    const random = new SeedRandom('abcd');
    for (let index = 0; index < 5; index++) {
      this.arr.push([]);
      for (let j = 0; j < 6; j++) {
        this.arr[index].push({
          type: random.random(0, 4),
          row: index,
          column: j,
          isComplete: false,
        });
      }
    }

    this.event();
    this.renderFn = this.render.bind(this);

    engine.addTick(this.renderFn);
  }
  private render() {
    const ctx = world.ctx;
    const arr = this.arr;
    const radius = this.radius;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    ctx.font = `${px.toPx(30)}px serif`;

    for (let rowIndex = 0; rowIndex < arr.length; rowIndex++) {
      for (let colIndex = 0; colIndex < arr[rowIndex].length; colIndex++) {
        ctx.fillStyle = BallTypes[arr[rowIndex][colIndex].type];
        if (
          this.userSelected.length &&
          this.userSelected[1] === rowIndex &&
          this.userSelected[0] === colIndex
        ) {
          ctx.fillStyle = BallTypesOpacity[arr[rowIndex][colIndex].type];
        }

        this.drawBall(
          colIndex * radius * 2 + radius,
          rowIndex * radius * 2 + radius
        );

        // if (this.userSelected[0] === -2) {
        //   ctx.strokeText(
        //     arr[rowIndex][colIndex].isComplete ? '1' : '',
        //     colIndex * radius * 2 + radius,
        //     rowIndex * radius * 2 + radius
        //   );
        // }
      }
    }
    if (this.touchStartPos.length) {
      this.drawBall(this.touchStartPos[0], this.touchStartPos[1]);
    }
  }
  private drawBall(x: number, y: number) {
    const ctx = world.ctx;
    ctx.beginPath();
    ctx.arc(x, y, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  private event() {
    const canvas = world.canvas;
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const x: number = e.touches[0].pageX;
      const y: number = e.touches[0].pageY;

      const xPos = Math.floor(x / (this.radius * 2));
      const yPos = Math.floor(y / (this.radius * 2));
      this.userSelected = [xPos, yPos];
      this.touchStartPos = [x, y];
    });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const x: number = e.touches[0].pageX;
      const y: number = e.touches[0].pageY;

      this.touchStartPos = [x, y];
    });

    const endEventHandler = (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      this.userSelected = [];
      this.touchStartPos = [];
    };
    canvas.addEventListener('touchend', endEventHandler);
    canvas.addEventListener('touchcancel', endEventHandler);
  }
  private horizontalCheck() {
    const arr = this.arr;
    let counter = 1;
    let prev: Ball | null = null;
    for (let rowIndex = 0; rowIndex < arr.length; rowIndex++) {
      counter = 1;
      const row = arr[rowIndex];
      prev = row[0];
      for (let colIndex = 1; colIndex < arr[rowIndex].length; colIndex++) {
        if (prev.type === row[colIndex].type) {
          counter++;
        } else if (counter < 3) {
          counter = 1;
        } else {
          for (let i = 0; i < counter; i++) {
            row[colIndex - i - 1].isComplete = true;
          }
          counter = 1;
        }
        prev = row[colIndex];
      }
      if (counter >= 3) {
        for (let i = 0; i < counter; i++) {
          row[row.length - 1 - i].isComplete = true;
        }
      }
    }
  }
  private verticalCheck() {
    const arr = this.arr;
    let counter = 1;
    let prev: Ball | null = null;
    for (let colIndex = 0; colIndex < arr[0].length; colIndex++) {
      counter = 1;
      prev = arr[0][colIndex];
      for (let rowIndex = 1; rowIndex < arr.length; rowIndex++) {
        if (prev.type === arr[rowIndex][colIndex].type) {
          counter++;
        } else if (counter < 3) {
          counter = 1;
        } else {
          for (let i = 0; i < counter; i++) {
            arr[rowIndex - i - 1][colIndex].isComplete = true;
          }
          counter = 1;
        }
        prev = arr[rowIndex][colIndex];
      }

      if (counter >= 3) {
        for (let i = 0; i < counter; i++) {
          arr[arr.length - 1 - i][colIndex].isComplete = true;
        }
      }
    }
  }
}
