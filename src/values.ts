export const BallTypes: ReadonlyArray<string> = [
  'rgb(255, 229, 0)',
  'rgb(5, 226, 0)',
  'rgb(0, 96, 255)',
  'rgb(220, 21, 0)',
  'rgb(3, 0, 0)',
];

export const BallTypesOpacity: ReadonlyArray<string> = [
  'rgba(255, 229, 0, .5)',
  'rgba(5, 226, 0, .5)',
  'rgba(0, 96, 255, .5)',
  'rgba(220, 21, 0, .5)',
  'rgba(3, 0, 0, .5)',
];

export const exchangeSpeed: number = 0.08;
export const removeAnimateSpeed: number = 0.2;
export const fallAnimateSpeed: number = 0.1;

export const rowCount: number = 5;
export const columnCount: number = 6;

export const enum ballStatus {
  default,
  touchStart,
  touchMove,
  touchEnd,
  remove,
  fall,
  disabled,
}

export enum eventType {
  init = 'init',
  remove = 'remove',
  disabled = 'disabled',
}
