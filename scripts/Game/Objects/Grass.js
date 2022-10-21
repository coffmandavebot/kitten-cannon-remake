import { Vector2D } from "../../Lib/Math/Vector2D.js";

export default class Grass {
    constructor(canvas2D_context, sprite_sheet) {
        this.__ctx = canvas2D_context;
        this.__sprite_sheet = sprite_sheet;
        this.__frame = sprite_sheet.getFrame("grass/1.png");

        let ar = this.__frame.getWidth() / this.__frame.getHeight();
        this.height = 200;
        this.width = this.height * ar;

        this.x = 0;
        this.y = this.__ctx.canvas.height - this.height + 2;
        // this.virtualPosXMax = this.__ctx.canvas.width - 250;
    
    }
    draw() {
        if (this.x < -this.width){ 
            this.x = 0;
        }
        // if ( x) this.x = 0;
        this.__frame.draw(this.__ctx, this.x, this.y, this.width, this.height);
        this.__frame.draw(this.__ctx, this.x+this.width-4, this.y, this.width, this.height);
        // this.__ctx.strokeRect(this.x,this.y,this.width,this.height);
    }
}