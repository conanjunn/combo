import { engine, Tick } from './engine';
import { AnimateCurve, px, SeedRandom } from './utils';
import { BallTypes, BallTypesOpacity } from './values';
import { world } from './world';

interface Ball {
  type: number;
  row: number;
  column: number;
  isComplete: boolean;
  animate: AnimateCurve | null;
}

export class Balls {
  private arr: Ball[][] = [];
  private colliderIndex: number[] = [];
  private touchPos: number[] = [];
  private radius: number = px.toPx(750 / 6 / 2);
  private renderFn: Tick;
  private userSelectedBall: Ball | null = null;
  private trail: Ball[] = [];

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
          animate: null,
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
    const radius = this.radius;

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

        this.renderBallAnimate(ball, deltaTime);

        if (ball.isComplete) {
          ctx.strokeText(
            ball.isComplete ? '1' : '',
            colIndex * radius * 2 + radius,
            rowIndex * radius * 2 + radius
          );
        }
      }
    }

    // 绘制跟随手指移动的球
    if (this.touchPos.length && this.userSelectedBall) {
      ctx.fillStyle = BallTypesOpacity[this.userSelectedBall.type];
      this.drawBall(this.touchPos[0], this.touchPos[1]);
    }
  }
  private renderBallAnimate(ball: Ball, deltaTime: number) {
    const radius = this.radius;
    const colIndex = ball.column;
    const rowIndex = ball.row;
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
      return;
    }
    ball.animate.update(deltaTime);
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
      this.touchPos = [x, y];

      const colIndex = Math.floor(x / (this.radius * 2));
      const rowIndex = Math.floor(y / (this.radius * 2));
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
      this.colliderIndex = [];
      this.touchPos = [];
      this.userSelectedBall = null;
      this.horizontalCheck();
      this.verticalCheck();
    };
    canvas.addEventListener('touchend', endEventHandler);
    canvas.addEventListener('touchcancel', endEventHandler);
  }
  exchange() {
    const ball1 = this.trail[0];
    const ball2 = this.trail[1];
    if (ball1.animate || ball2.animate) {
      return;
    }
    if (ball1.column > ball2.column) {
      // ball1在ball2的右
      ball1.animate = new AnimateCurve('left', this.radius, 0.05);
      ball2.animate = new AnimateCurve('right', this.radius, 0.05);
    } else if (ball1.column < ball2.column) {
      ball1.animate = new AnimateCurve('right', this.radius, 0.05);
      ball2.animate = new AnimateCurve('left', this.radius, 0.05);
    } else if (ball1.row > ball2.row) {
      // ball1在2的下面
      ball1.animate = new AnimateCurve('top', this.radius, 1);
      ball2.animate = new AnimateCurve('bottom', this.radius, 1);
    } else if (ball1.row < ball2.row) {
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
