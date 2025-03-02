import { Vector2D } from "../../../Lib/Math/Vector2D.js";
import Button from "../Button.js";

export default class Creditscreen {
    constructor(canvas2D_context, screens_sprite, button_font_family) {
        this.__ctx = canvas2D_context;
        this.__sprite_sheet = screens_sprite;
        this.__button_font_family = button_font_family;
        this.__frame = screens_sprite.getFrame("credits_screen.png");
        this.onBackClick = () => { };
        this.buttons = {};
        this.visible = true;
        
        // Add credits text content
        this.creditsText = [
            "This is very clearly based on the very rad",
            "Kitten Cannon flash game by Dan Fleming. That",
            "died with flash, but if this poor imitation",
			"doesn't satiate you, you can find a better",
            "version on addictinggames.com. Credit also",
            "to Prashanth Kumar for porting it to",
            "javascript and posting source to github."
        ];
        
        this.__create_buttons();
    }
    
    __create_buttons() {
        let canvas_w_half = this.__ctx.canvas.width / 2;
        let canvas_h = this.__ctx.canvas.height;
        let font_size = 70;
        this.__ctx.font = font_size + "px " + this.__button_font_family;

        { // Start button
            let text = "Back";
            let font_width = this.__ctx.measureText(text).width / 2; // why?
            let position = new Vector2D(canvas_w_half - font_width / 2, canvas_h - 80);

            this.buttons["start"] = new Button(this.__ctx, text, position, 60, "#000", this.__button_font_family);
            this.buttons["start"].onClick = () => {
                this.onBackClick();
            }
        }
    }
    
    updateClickInput(cursor_position_vec) {
        if (!this.visible) return;
        if (!(cursor_position_vec instanceof Vector2D)) throw Error(" Cursor position should be a vector2D .");
        for (let button_key in this.buttons) {
            this.buttons[button_key].updateClickInput(cursor_position_vec);
        }
    }
    
    draw() {
        if (!this.visible) return;

        this.__frame.draw(this.__ctx, 0, 0, this.__ctx.canvas.width, this.__ctx.canvas.height);
        
        // Draw the credits text
        this.__drawCreditsText();

        for (let key in this.buttons) {
            this.buttons[key].draw();
        }
    }
    
    __drawCreditsText() {
        const ctx = this.__ctx;
        const canvasWidth = ctx.canvas.width;
        const canvasHeight = ctx.canvas.height;
        
        // Set text properties
        ctx.font = "24px " + this.__button_font_family;
        ctx.fillStyle = "#000";
        ctx.textAlign = "center";
        
        // Calculate starting Y position to center the text block
        const lineHeight = 36;
        const totalTextHeight = this.creditsText.length * lineHeight;
        const verticalOffset = 100;
        let yPos = (canvasHeight - totalTextHeight) / 2 + verticalOffset;
		
        // Draw each line
        this.creditsText.forEach(line => {
            ctx.fillText(line, canvasWidth / 2, yPos);
            yPos += lineHeight;
        });
        
        // Reset text alignment to default
        ctx.textAlign = "start";
    }
}