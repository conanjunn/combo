import { AnimateCurve, AnimateLinear } from './utils/animate';
import { px } from './utils/unit';
import { SeedRandom } from './utils/random';
import { random } from './utils/random';
import {
  ballStatus,
  BallTypes,
  BallTypesOpacity,
  columnCount,
  eventType,
  exchangeSpeed,
  fallAnimateSpeed,
  removeAnimateSpeed,
  rowCount,
} from './values';
import { World } from './world';
import EventEmitter from 'eventemitter3';

interface Ball {
  type: number;
  row: number;
  column: number;
  isComplete: boolean;
  animate: AnimateCurve | null;
  removeAnimate: AnimateLinear | null;
  fallAnimate: AnimateLinear | null;
}

export class Balls {
  private world: World;
  private arr: Ball[][] = [];
  private colliderIndex: number[] = [];
  private touchPos: number[] = [];
  private radius: number = px.toPx(750 / columnCount / 2);
  private userSelectedBall: Ball | null = null;
  private trail: Ball[] = [];
  private status: ballStatus = ballStatus.default;
  private removeList: Ball[][] = [];
  private removedList: Ball[] = [];
  private extraList: Ball[][] = [];
  private extraAnimateList: Ball[] = [];
  private containerY: number =
    window.document.documentElement.clientHeight -
    this.radius * 2 * rowCount -
    px.toPx(50);
  private event: EventEmitter;

  constructor(world: World) {
    this.world = world;
    this.event = world.event;

    this.initBalls();
    this.touchEvent();

    this.world.engine.addTick(this.render.bind(this));

    const ctx = world.ctx;
    ctx.strokeStyle = 'red';
  }
  private initBalls() {
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
          fallAnimate: null,
        });
      }
    }
  }
  private render(deltaTime: number) {
    const ctx = this.world.ctx;

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'white';
    ctx.font = `${px.toPx(30)}px serif`;

    // 判断是否有需要添加交换位置的珠子的动画
    if (this.trail.length > 1) {
      this.addExchangeAnimate();
    }

    switch (this.status) {
      case ballStatus.touchStart:
      case ballStatus.touchMove:
      case ballStatus.touchEnd:
        this.iterateAll((ball: Ball) => {
          if (this.userSelectedBall == ball) {
            ctx.fillStyle = BallTypesOpacity[ball.type];
          }
          this.renderExchangeAnimate(ball, deltaTime);
          // 绘制跟随手指移动的球
          if (this.touchPos.length && this.userSelectedBall) {
            ctx.fillStyle = BallTypesOpacity[this.userSelectedBall.type];
            this.drawBall(this.touchPos[0], this.touchPos[1]);
          }
        });
        break;

      case ballStatus.remove:
        this.iterateAll((ball: Ball) => {
          if (!ball.isComplete) {
            this.renderDefault(ball);
          } else if (
            this.removeList[0] &&
            this.removeList[0].indexOf(ball) !== -1
          ) {
            // 这个珠子需要做消失的动画
            this.renderRemoveAnimate(ball, deltaTime);
          } else if (this.removedList.indexOf(ball) === -1) {
            // 这个珠子需要做消失的动画，但目前还没轮到它，所以正常绘制
            this.renderDefault(ball);
          }
        });
        if (!this.removeList.length) {
          // 最后一组消除动画已经结束
          this.extraList = this.createFallBall();

          this.status = ballStatus.fall;
        }
        break;

      case ballStatus.fall:
        {
          let fallingCounter: number = 0;
          this.iterateAll((ball: Ball) => {
            this.renderFallAnimate(ball, deltaTime);
            ball.isComplete && fallingCounter++; // 这里是不是应该用isCompleted判断？
          });

          if (!this.extraAnimateList.length) {
            this.extraList.forEach((list: Ball[]) => {
              if (!list || !list.length) {
                return;
              }
              const ball = list.shift();
              if (ball) {
                ball.fallAnimate = new AnimateLinear(
                  [0, 0],
                  [this.radius * 2, 0],
                  fallAnimateSpeed
                );
                this.extraAnimateList.push(ball);
              }
            });
          }
          let isCompleted = false;
          this.extraAnimateList.forEach((ball: Ball) => {
            const radius = this.radius;
            const colIndex = ball.column;

            if (ball.fallAnimate) {
              ctx.fillStyle = BallTypes[ball.type];
              this.drawBall(
                colIndex * radius * 2 + radius,
                ball.fallAnimate.getPos()[0] + this.radius * -1
              );

              if (ball.fallAnimate.getIsCompleted()) {
                ball.fallAnimate = null;
                ball.row = 0;
                this.arr[0][ball.column] = ball;
                isCompleted = true;
                return;
              }
              ball.fallAnimate.update(deltaTime);
            }
          });

          if (isCompleted) {
            this.extraAnimateList = [];
          }

          if (!fallingCounter) {
            this.comboCheck();
          }
        }
        break;

      default:
        this.iterateAll(this.renderDefault.bind(this));
        break;
    }
  }
  private renderDefault(ball: Ball) {
    this.world.ctx.globalAlpha = 1;
    const radius = this.radius;
    const colIndex = ball.column;
    const rowIndex = ball.row;
    this.drawBall(
      colIndex * radius * 2 + radius,
      rowIndex * radius * 2 + radius
    );
  }
  private renderExchangeAnimate(ball: Ball, deltaTime: number) {
    const radius = this.radius;
    const colIndex = ball.column;
    const rowIndex = ball.row;
    this.world.ctx.globalAlpha = 1;

    if (!ball.animate) {
      this.renderDefault(ball);
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
      const ball1 = this.trail[0];
      const ball2 = this.trail[1];

      ball1.animate = null;
      ball2.animate = null;
      // 动画已结束,交换源数组里的两个球的位置
      this.exchange(ball1, ball2);

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
    const ctx = this.world.ctx;
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
    const ctx = this.world.ctx;
    ctx.beginPath();
    ctx.arc(x, y + this.containerY, this.radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
  }
  private touchEvent() {
    const canvas = this.world.canvas;
    canvas.addEventListener('touchstart', (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.status === ballStatus.disabled) {
        return;
      }
      const x: number = e.touches[0].pageX;
      const y: number = e.touches[0].pageY - this.containerY;
      const colIndex = Math.floor(x / (this.radius * 2));
      const rowIndex = Math.floor(y / (this.radius * 2));
      if (!this.isValidIndex(rowIndex, colIndex)) {
        return;
      }

      this.status = ballStatus.touchStart;
      this.colliderIndex = [rowIndex, colIndex];
      this.touchPos = [x, y];
      this.userSelectedBall = this.arr[rowIndex][colIndex];
      this.trail.push(this.userSelectedBall);
    });

    canvas.addEventListener('touchmove', (e: TouchEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (this.status === ballStatus.disabled) {
        return;
      }
      const x: number = e.touches[0].pageX;
      const y: number = e.touches[0].pageY - this.containerY;
      const colIndex = Math.floor(x / (this.radius * 2));
      const rowIndex = Math.floor(y / (this.radius * 2));
      if (!this.isValidIndex(rowIndex, colIndex)) {
        return;
      }

      this.touchPos = [x, y];
      this.status = ballStatus.touchMove;
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
      if (this.status === ballStatus.disabled) {
        return;
      }

      this.status = ballStatus.touchEnd;

      this.comboCheck();
    };
    canvas.addEventListener('touchend', endEventHandler);
    canvas.addEventListener('touchcancel', endEventHandler);
  }
  private addExchangeAnimate() {
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
    if (
      [ballStatus.touchEnd, ballStatus.fall].indexOf(this.status) === -1 ||
      this.trail.length > 1
    ) {
      return;
    }
    this.colliderIndex = [];
    this.touchPos = [];
    this.userSelectedBall = null;
    this.trail = [];
    this.horizontalCheck();
    this.verticalCheck();

    if (this.removeList.length) {
      this.status = ballStatus.remove;
      this.event.emit(eventType.remove);
      return;
    }
    this.status = ballStatus.disabled;
    this.event.emit(eventType.disabled);
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
  private renderFallAnimate(ball: Ball, deltaTime: number) {
    if (ball.isComplete) {
      return;
    }
    if (ball.row >= rowCount - 1) {
      this.renderDefault(ball);
      return;
    }
    const bottomBall = this.arr[ball.row + 1][ball.column];
    if (!bottomBall.isComplete && !bottomBall.fallAnimate) {
      // 下面的珠子没有被消除，也没有做下落动画
      this.renderDefault(ball);
      return;
    }
    if (!ball.fallAnimate) {
      ball.fallAnimate = new AnimateLinear(
        [0, 0],
        [this.radius * 2, 0],
        fallAnimateSpeed
      );
    }
    if (ball.fallAnimate.getIsCompleted()) {
      // 动画结束后交换上下球的位置信息，重新递归检测是否需要继续下落
      ball.fallAnimate = null;
      this.exchange(ball, bottomBall);
      this.renderFallAnimate(ball, deltaTime);
      return;
    }
    const [deltaY] = ball.fallAnimate.getPos();
    this.drawBall(
      ball.column * this.radius * 2 + this.radius,
      deltaY + (ball.row * this.radius * 2 + this.radius)
    );
    ball.fallAnimate.update(deltaTime);
  }
  private createFallBall(): Ball[][] {
    const fallBalls: Ball[][] = [];
    this.removedList.forEach((item) => {
      if (!fallBalls[item.column]) {
        fallBalls[item.column] = [];
      }
      fallBalls[item.column].push({
        type: random(0, 4),
        row: (fallBalls[item.column].length + 1) * -1,
        column: item.column,
        isComplete: false,
        animate: null,
        removeAnimate: null,
        fallAnimate: new AnimateLinear(
          [0, 0],
          [this.radius * 2, 0],
          fallAnimateSpeed
        ),
      });
    });
    this.removedList = [];
    return fallBalls;
  }
  private iterateAll(callback: { (ball: Ball): void }) {
    const arr = this.arr;
    const ctx = this.world.ctx;
    for (let rowIndex = arr.length - 1; rowIndex >= 0; rowIndex--) {
      for (let colIndex = 0; colIndex < arr[rowIndex].length; colIndex++) {
        const ball = arr[rowIndex][colIndex];
        ctx.fillStyle = BallTypes[ball.type];
        callback(ball);
      }
    }
  }
  private exchange(ball1: Ball, ball2: Ball) {
    this.arr[ball1.row][ball1.column] = ball2;
    this.arr[ball2.row][ball2.column] = ball1;

    const backupBall1: Ball = { ...ball1 };

    ball1.row = ball2.row;
    ball1.column = ball2.column;

    ball2.row = backupBall1.row;
    ball2.column = backupBall1.column;
  }
  getRemoveList(): Readonly<Ball[][]> {
    return this.removeList;
  }
}
