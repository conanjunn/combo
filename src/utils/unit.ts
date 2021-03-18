class UnitPx {
  constructor() {}
  private maxWidth: number = 0;
  init(canvas: HTMLCanvasElement) {
    this.maxWidth = canvas.width;
  }
  toPx(px: number) {
    const preW = this.maxWidth / 100;
    return Math.floor((px / 7.5) * preW);
  }
}

export const px = new UnitPx();

export const deg2rad = (deg: number): number => {
  return (Math.PI / 180) * deg;
};

export const rad2deg = (rad: number): number => {
  return (rad / Math.PI) * 180;
};
