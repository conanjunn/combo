import { SeedRandom } from './utils';
import { BallTypes } from './values';
import { px } from './utils';

const random = new SeedRandom('abcd');
const canvas = document.getElementById('cvs') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

px.init(canvas);

interface Ball {
  type: number;
  row: number;
  column: number;
  isComplete: boolean;
}

const arr: Ball[][] = [];

for (let index = 0; index < 5; index++) {
  arr.push([]);
  for (let j = 0; j < 6; j++) {
    arr[index].push({
      type: random.random(0, 4),
      row: index,
      column: j,
      isComplete: false,
    });
  }
}

let prev: Ball | null = null;
let counter: number = 0;

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

ctx.lineWidth = 1;
ctx.strokeStyle = 'white';
ctx.font = `${px.toPx(30)}px serif`;
const radius: number = px.toPx(750 / 6 / 2);

for (let rowIndex = 0; rowIndex < arr.length; rowIndex++) {
  for (let colIndex = 0; colIndex < arr[rowIndex].length; colIndex++) {
    ctx.beginPath();
    ctx.fillStyle = BallTypes[arr[rowIndex][colIndex].type];
    ctx.arc(
      colIndex * radius * 2 + radius,
      rowIndex * radius * 2 + radius,
      radius,
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.stroke();
    ctx.strokeText(
      arr[rowIndex][colIndex].isComplete ? '1' : '',
      colIndex * radius * 2 + radius,
      rowIndex * radius * 2 + radius
    );
  }
}
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  e.stopPropagation();
});
