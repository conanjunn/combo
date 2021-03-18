import { engine, Tick } from './engine';
import { AnimateCurve, AnimateLinear } from './utils/animate';
import { px } from './utils/unit';
import { SeedRandom } from './utils/random';
import {
  BallTypes,
  BallTypesOpacity,
  columnCount,
  exchangeSpeed,
  removeAnimateSpeed,
  rowCount,
} from './values';
import { world } from './world';

interface Ball {
  type: number;
  row: number;
  column: number;
  isComplete: boolean;
  animate: AnimateCurve | null;
  removeAnimate: AnimateLinear | null;
}

export class Balls {
  private arr: Ball[][] = [];
  private colliderIndex: number[] = [];
  private touchPos: number[] = [];
  private radius: number = px.toPx(750 / columnCount / 2);
  private renderFn: Tick;
  private userSelectedBall: Ball | null = null;
  private trail: Ball[] = [];
  private touchStatus: string = ''; // start move end
  private removeList: Ball[][] = [];
  private removedList: Ball[] = [];

  constructor() {
    const random = new SeedRandom('abcd');
    for (let index = 0; index < rowCount; index++) {
      this.arr.push([]);
      for (let j = 0; j < columnCount; j++) {
        this.arr[index].push({
          type: random.random(0, 4),
          row: index,
          column: j,
          isComplete: false,
          animate: null,
          removeAnimate: null,
        });
      }
    }

    this.event();
    this.renderFn = this.render.bind(this);

    engine.addTick(this.renderFn);

    const ctx = world.ctx;
    ctx.strokeStyle = 'red';
  }
  private render(deltaTime: number) {
    const ctx = world.ctx;
    const arr = this.arr;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    ctx.font = `${px.toPx(30)}px serif`;

    // 判断是否有需要交换位置的珠子
    if (this.trail.length > 1) {
      this.exchange();
    }

    for (let rowIndex = 0; rowIndex < arr.length; rowIndex++) {
      for (let colIndex = 0; colIndex < arr[rowIndex].length; colIndex++) {
        const ball = arr[rowIndex][colIndex];
        ctx.fillStyle = BallTypes[ball.type];
        if (this.userSelectedBall == ball) {
          ctx.fillStyle = BallTypesOpacity[ball.type];
        }

        if (!ball.isComplete) {
          this.renderExchangeAnimate(ball, deltaTime);
        } else if (
          this.removeList[0] &&
          this.removeList[0].indexOf(ball) !== -1
        ) {
          // 这个珠子需要做消失的动画
          this.renderRemoveAnimate(ball, deltaTime);
        } else if (this.removedList.indexOf(ball) === -1) {
          // 这个珠子需要做消失的动画，但目前还没轮到它，所以正常绘制
          this.renderExchangeAnimate(ball, deltaTime);
        }
      }
    }

    // 绘制跟随手指移动的球
    if (this.touchPos.length && this.userSelectedBall) {
      ctx.fillStyle = BallTypesOpacity[this.userSelectedBall.type];
      this.drawBall(this.touchPos[0], this.touchPos[1]);
    }
  }
  private renderExchangeAnimate(ball: Ball, deltaTime: number) {
    const radius = this.radius;
    const colIndex = ball.column;
    const rowIndex = ball.row;

    world.ctx.globalAlpha = 1;

    if (!ball.animate) {
      this.drawBall(
        colIndex * radius * 2 + radius,
        rowIndex * radius * 2 + radius
      );
      return;
    }

    const pos = ball.animate.getPos();
    switch (ball.animate.direction) {
      case 'right':
        this.drawBall(
          pos[0] + (colIndex * radius * 2 + radius * 2), // 已球的最右侧为原点
          pos[1] + (rowIndex * radius * 2 + radius)
        );
        break;

      case 'left':
        this.drawBall(
          pos[0] + colIndex * radius * 2, // 已球的最左侧为原点
          pos[1] + (rowIndex * radius * 2 + radius)
        );
        break;

      case 'top':
        this.drawBall(
          pos[0] + colIndex * radius * 2 + radius,
          pos[1] + rowIndex * radius * 2
        );
        break;

      case 'bottom':
        this.drawBall(
          pos[0] + colIndex * radius * 2 + radius,
          pos[1] + (rowIndex * radius * 2 + radius * 2)
        );
        break;

      default:
        console.error('ball animate direction error', ball);
        break;
    }

    if (ball.animate.getIsCompleted()) {
      // 动画已结束,交换源数组里的两个球的位置
      const ball1 = this.trail[0];
      const ball2 = this.trail[1];
      this.arr[ball1.row][ball1.column] = ball2;
      this.arr[ball2.row][ball2.column] = ball1;

      const backupBall1: Ball = { ...ball1 };

      ball1.row = ball2.row;
      ball1.column = ball2.column;
      ball1.animate = null;

      ball2.row = backupBall1.row;
      ball2.column = backupBall1.column;
      ball2.animate = null;

      this.colliderIndex = [ball1.row, ball1.column];

      this.trail = this.trail.filter((item, index) => {
        return index !== 1;
      });

      // 处理touchend比珠子交换动画早触发的情况
      this.comboCheck();

      return;
    }
    ball.animate.update(deltaTime);
  }
  private renderRemoveAnimate(ball: Ball, deltaTime: number) {
    const ctx = world.ctx;
    const radius = this.radius;
    const colIndex = ball.column;
    const rowIndex = ball.row;
    if (!ball.removeAnimate) {
      return;
    }
    if (ball.removeAnimate.getIsCompleted()) {
      const removed = this.removeList.shift();
      if (removed) {
        this.removedList = this.removedList.concat(removed);
      }
      return;
    }
    const [alpha] = ball.removeAnimate.getPos();
    ctx.globalAlpha = alpha;
    this.drawBall(
      colIndex * radius * 2 + radius,
      rowIndex * radius * 2 + radius
    );
    ball.removeAnimate.update(deltaTime);
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
      const colIndex = Math.floor(x / (this.radius * 2));
      const rowIndex = Math.floor(y / (this.radius * 2));
      if (!this.isValidIndex(rowIndex, colIndex)) {
        return;
      }

      this.touchStatus = 'start';
      this.colliderIndex = [rowIndex, colIndex];
      this.touchPos = [x, y];
      this.userSelectedBall = this.arr[rowIndex][colIndex];
      this.trail.push(this.userSelectedBall);
    });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const x: number = e.touches[0].pageX;
      const y: number = e.touches[0].pageY;
      const colIndex = Math.floor(x / (this.radius * 2));
      const rowIndex = Math.floor(y / (this.radius * 2));
      if (!this.isValidIndex(rowIndex, colIndex)) {
        return;
      }

      this.touchPos = [x, y];
      this.touchStatus = 'move';
      if (
        this.colliderIndex[0] !== rowIndex ||
        this.colliderIndex[1] !== colIndex
      ) {
        // TODO: 判断是否相邻
        const target = this.arr[rowIndex][colIndex];
        const isInTrail = this.trail.find((item) => {
          return item === target;
        });
        if (!isInTrail) {
          this.trail.push(target);
        }
      }
    });

    const endEventHandler = (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();

      this.touchStatus = 'end';

      this.comboCheck();
    };
    canvas.addEventListener('touchend', endEventHandler);
    canvas.addEventListener('touchcancel', endEventHandler);
  }
  private exchange() {
    const ball1 = this.trail[0];
    const ball2 = this.trail[1];
    if (ball1.animate || ball2.animate) {
      return;
    }
    if (ball1.column > ball2.column) {
      // ball1在ball2的右
      ball1.animate = new AnimateCurve('left', this.radius, exchangeSpeed);
      ball2.animate = new AnimateCurve('right', this.radius, exchangeSpeed);
    } else if (ball1.column < ball2.column) {
      ball1.animate = new AnimateCurve('right', this.radius, exchangeSpeed);
      ball2.animate = new AnimateCurve('left', this.radius, exchangeSpeed);
    } else if (ball1.row > ball2.row) {
      // ball1在2的下面
      ball1.animate = new AnimateCurve('top', this.radius, exchangeSpeed);
      ball2.animate = new AnimateCurve('bottom', this.radius, exchangeSpeed);
    } else if (ball1.row < ball2.row) {
      ball1.animate = new AnimateCurve('bottom', this.radius, exchangeSpeed);
      ball2.animate = new AnimateCurve('top', this.radius, exchangeSpeed);
    }
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
          const tmp = [];
          for (let i = 0; i < counter; i++) {
            tmp.push(row[colIndex - i - 1]);
          }
          this.addToRemoveList(tmp);
          counter = 1;
        }
        prev = row[colIndex];
      }
      if (counter >= 3) {
        const tmp = [];
        for (let i = 0; i < counter; i++) {
          tmp.push(row[row.length - 1 - i]);
        }
        this.addToRemoveList(tmp);
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
          const tmp = [];
          for (let i = 0; i < counter; i++) {
            tmp.push(arr[rowIndex - i - 1][colIndex]);
          }
          this.addToRemoveList(tmp);
          counter = 1;
        }
        prev = arr[rowIndex][colIndex];
      }

      if (counter >= 3) {
        const tmp = [];
        for (let i = 0; i < counter; i++) {
          tmp.push(arr[arr.length - 1 - i][colIndex]);
        }
        this.addToRemoveList(tmp);
      }
    }
  }
  private comboCheck() {
    if (this.touchStatus !== 'end' || this.trail.length > 1) {
      return;
    }
    this.colliderIndex = [];
    this.touchPos = [];
    this.userSelectedBall = null;
    this.trail = [];
    this.horizontalCheck();
    this.verticalCheck();
  }
  private isValidIndex(row: number, col: number) {
    if (row < 0 || row > rowCount - 1) {
      return false;
    }
    if (col < 0 || col > columnCount - 1) {
      return false;
    }
    return true;
  }
  private addToRemoveList(balls: Ball[]) {
    const completed = balls.find((item) => {
      return item.isComplete;
    });

    if (completed) {
      // 珠子连成十字或者T型等横竖都有交叉的情况
      this.removeList.forEach((list) => {
        const ret = list.find((item) => {
          return item === completed;
        });
        if (ret) {
          balls.forEach((item) => {
            if (item === ret) {
              return;
            }
            item.isComplete = true;
            item.removeAnimate = new AnimateLinear(
              [1, 0],
              [0, 0],
              removeAnimateSpeed
            );
            list.push(item);
          });
        }
      });
      return;
    }
    balls.forEach((ball) => {
      ball.isComplete = true;
      ball.removeAnimate = new AnimateLinear(
        [1, 0],
        [0, 0],
        removeAnimateSpeed
      );
    });
    this.removeList.push(balls);
  }
  private getFallBall(): Ball[][] {
    const fallCounter: number[] = [];
    this.removedList.forEach((item) => {
      if (fallCounter[item.column]) {
        fallCounter[item.column]++;
        return;
      }
      fallCounter[item.column] = 1;
    });
    return [];
  }
}
