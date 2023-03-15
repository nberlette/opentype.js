// Geometric objects

import BoundingBox from "./bbox.js";

/**
 * A bézier path containing a set of path commands similar to a SVG path.
 * Paths can be drawn on a context using `draw`.
 */
export class Path {
  constructor() {
    this.commands = [];
    this.fill = "black";
    this.stroke = null;
    this.strokeWidth = 1;
  }

  /**
   * Move the current drawing position to the given point.
   *
   * @param {number} x - x coordinate of the destination point (absolute)
   * @param {number} y - y coordinate of the destination point (absolute)
   */
  moveTo(x, y) {
    this.commands.push({ type: "M", x, y });
    return this;
  }

  /**
   * Draw a line from the current drawing position to the given point.
   *
   * @param {number} x - x coordinate of the destination point (absolute)
   * @param {number} y - y coordinate of the destination point (absolute)
   */
  lineTo(x, y) {
    this.commands.push({ type: "L", x, y });
    return this;
  }

  /**
   * Draws a cubic bezier curve from the current drawing position to the given
   * point, using two control points to define the curve.
   *
   * @param {number} x1 - x coordinate of control point 1 (absolute)
   * @param {number} y1 - y coordinate of control point 1 (absolute)
   * @param {number} x2 - x coordinate of control point 2 (absolute)
   * @param {number} y2 - y coordinate of control point 2 (absolute)
   * @param {number} x - x coordinate of path point (absolute)
   * @param {number} y - y coordinate of path point (absolute)
   * @see {@link Path.prototype.bezierCurveTo}
   */
  curveTo(x1, y1, x2, y2, x, y) {
    this.commands.push({ type: "C", x1, y1, x2, y2, x, y });
    return this;
  }

  /**
   * Draws a quadratic bezier curve from the current drawing position to the
   * given point, using a control point to define the curve.
   *
   * @param {number} x1 - x coordinate of control point (absolute)
   * @param {number} y1 - y coordinate of control point (absolute)
   * @param {number} x - x coordinate of path point (absolute)
   * @param {number} y - y coordinate of path point (absolute)
   */
  quadTo(x1, y1, x, y) {
    this.commands.push({ type: "Q", x1, y1, x, y });
    return this;
  }

  /** Closes the path. */
  closePath() {
    this.commands.push({ type: "Z" });
    return this;
  }

  /**
   * Draws cubic curve.
   *
   * @param {number} x1 - x of control 1
   * @param {number} y1 - y of control 1
   * @param {number} x2 - x of control 2
   * @param {number} y2 - y of control 2
   * @param {number} x - x of path point
   * @param {number} y - y of path point
   */
  bezierCurveTo(x1, y1, x2, y2, x, y) {
    return this.curveTo(x1, y1, x2, y2, x, y);
  }

  /**
   * Draws quadratic curve
   *
   * @param {number} x1 - x of control
   * @param {number} y1 - y of control
   * @param {number} x - x of path point
   * @param {number} y - y of path point
   */
  quadraticCurveTo(x1, y1, x, y) {
    return this.quadTo(x1, y1, x, y);
  }

  /** Close the path. */
  close() {
    return this.closePath();
  }

  /**
   * Add the given path or list of commands to the commands of this path.
   * @param  {Array} pathOrCommands - another opentype.Path, an opentype.BoundingBox, or an array of commands.
   */
  extend(pathOrCommands) {
    if (pathOrCommands.commands) {
      pathOrCommands = pathOrCommands.commands;
    } else if (pathOrCommands instanceof BoundingBox) {
      const box = pathOrCommands;
      this.moveTo(box.x1, box.y1);
      this.lineTo(box.x2, box.y1);
      this.lineTo(box.x2, box.y2);
      this.lineTo(box.x1, box.y2);
      this.close();
      return;
    }

    Array.prototype.push.apply(this.commands, pathOrCommands);
    return this;
  }

  /**
   * Calculate the bounding box of the path.
   * @returns {opentype.BoundingBox}
   */
  getBoundingBox() {
    const box = new BoundingBox();
    let startX = 0, startY = 0, prevX = 0, prevY = 0;

    for (let i = 0; i < this.commands.length; i++) {
      const cmd = this.commands[i];
      switch (cmd.type) {
        case "M":
          box.addPoint(cmd.x, cmd.y);
          startX = prevX = cmd.x;
          startY = prevY = cmd.y;
          break;
        case "L":
          box.addPoint(cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        case "Q":
          box.addQuad(prevX, prevY, cmd.x1, cmd.y1, cmd.x, cmd.y);
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        case "C":
          box.addBezier(
            prevX,
            prevY,
            cmd.x1,
            cmd.y1,
            cmd.x2,
            cmd.y2,
            cmd.x,
            cmd.y,
          );
          prevX = cmd.x;
          prevY = cmd.y;
          break;
        case "Z":
          prevX = startX;
          prevY = startY;
          break;
        default:
          throw new Error("Unexpected path command " + cmd.type);
      }
    }

    if (box.isEmpty()) box.addPoint(0, 0);

    return box;
  }

  /**
   * Draw the path to a 2D context.
   * @param {CanvasRenderingContext2D} ctx - A 2D drawing context.
   */
  draw(ctx) {
    ctx.beginPath();

    for (let i = 0; i < this.commands.length; i += 1) {
      const cmd = this.commands[i];

      if (cmd.type === "M") {
        ctx.moveTo(cmd.x, cmd.y);
      } else if (cmd.type === "L") {
        ctx.lineTo(cmd.x, cmd.y);
      } else if (cmd.type === "C") {
        ctx.bezierCurveTo(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      } else if (cmd.type === "Q") {
        ctx.quadraticCurveTo(cmd.x1, cmd.y1, cmd.x, cmd.y);
      } else if (cmd.type === "Z") {
        ctx.closePath();
      }
    }

    if (this.fill) {
      ctx.fillStyle = this.fill;
      ctx.fill();
    }

    if (this.stroke) {
      ctx.strokeStyle = this.stroke;
      ctx.lineWidth = this.strokeWidth;
      ctx.stroke();
    }

    return this;
  }

  /**
   * Convert the Path to a string of path data instructions
   * See http://www.w3.org/TR/SVG/paths.html#PathData
   * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
   * @return {string}
   */
  toPathData(decimalPlaces) {
    decimalPlaces = decimalPlaces !== undefined ? decimalPlaces : 2;

    function floatToString(v) {
      return (
        Math.round(v) === v ? "" + Math.round(v) : v.toFixed(decimalPlaces)
      );
    }

    function packValues() {
      let s = "";
      for (let i = 0; i < arguments.length; i += 1) {
        const v = arguments[i];
        if (v >= 0 && i > 0) s += " ";
        s += floatToString(v);
      }
      return s;
    }

    let d = "";
    for (let i = 0; i < this.commands.length; i += 1) {
      const cmd = this.commands[i];
      if (cmd.type === "M") {
        d += "M" + packValues(cmd.x, cmd.y);
      } else if (cmd.type === "L") {
        d += "L" + packValues(cmd.x, cmd.y);
      } else if (cmd.type === "C") {
        d += "C" + packValues(cmd.x1, cmd.y1, cmd.x2, cmd.y2, cmd.x, cmd.y);
      } else if (cmd.type === "Q") {
        d += "Q" + packValues(cmd.x1, cmd.y1, cmd.x, cmd.y);
      } else if (cmd.type === "Z") {
        d += "Z";
      }
    }

    return d;
  }

  /**
   * Convert the path to an SVG <path> element, as a string.
   * @param {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
   * @return {string}
   */
  toSVG(decimalPlaces) {
    let svg = `<path d="${this.toPathData(decimalPlaces)}"`;

    if (this.fill !== "black") svg += ` fill="${this.fill ?? "none"}"`;
    if (this.stroke) {
      svg += ` stroke="${this.stroke ?? "transparent"}"`;
      if (this.strokeWidth) svg += ` stroke-width="${this.strokeWidth ?? 0}"`;
    }

    svg += "/>";
    return svg;
  }

  /**
   * Convert the path to a DOM element.
   * @param  {number} [decimalPlaces=2] - The amount of decimal places for floating-point values
   * @return {SVGPathElement}
   */
  toDOMElement(decimalPlaces) {
    if (typeof document === "object" && "createElementNS" in document) {
      if (typeof document.createElementNS === "function") {
        const temporaryPath = this.toPathData(decimalPlaces);
        const newPath = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        );

        newPath.setAttribute("d", temporaryPath);

        return newPath;
      } else {
        throw new TypeError(
          `Unable to render DOM element. Path expected \`document.createElementNS\` to be a function, but the actual type is ${typeof document
            .createElementNS}. Did you mean to run this in a browser?`,
        );
      }
    } else {
      throw new TypeError(
        `Unable to render DOM element. Did you mean to run this in a browser?`,
      );
    }
  }
}

export default Path;
