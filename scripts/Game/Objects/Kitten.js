import { Vector2D } from "../../Lib/Math/Vector2D.js";

export default class Kitten {
    constructor(canvas2D_context, sprite_sheet) {
        this.__ctx = canvas2D_context;

        this.__frames_hq = [];
        let kitty_hq_anim_names = sprite_sheet.getAnimationFrames("kitty_hq");
        kitty_hq_anim_names.forEach((animName) => {
            this.__frames_hq.push(sprite_sheet.getFrame(animName));
        });

        this.minVelocityMagSq = 10 ** 2;
        this.boneBreakingVelocityMagSq = this.minVelocityMagSq;
        this.__frames_lq = [];
        let kitty_lq_anim_names = sprite_sheet.getAnimationFrames("kitty");
        kitty_lq_anim_names.forEach((animName) => {
            this.__frames_lq.push(sprite_sheet.getFrame(animName));
        });

        this.groundLevel = canvas2D_context.canvas.height - 24;
        this.groundDampFactor = 0.7;

        this.position = new Vector2D(0, 0);
        this.origin = this.position.copy();
        this.velocity = new Vector2D(5, -5);
        this.gravity = new Vector2D(0, 1.0);
        let ar = this.__frames_hq[0].getWidth() / this.__frames_hq[0].getHeight();
        this.height = 86;
        this.width = ar * this.height;
        this.rotation = 0;
        this.spriteIndex = 0;
        this.in_jerk = false;
        this.isDead = false;
        this.visible = false;
        this.omega = 0.05;
        this.virtualPosXMax = this.__ctx.canvas.width - 300;
    }

    throw(velocity) {
        this.rotation = velocity.getAngle();
        this.velocity = velocity;
        this.in_jerk = true;
        this.origin = this.position.copy();
    }
    update() {
        if (!this.visible) return;
        this.in_jerk = false;
        if (this.isDead) {
            this.position.y = this.groundLevel - this.height;
            console.log("dead");
            return;
        }
        this.position.add(this.velocity);
        this.velocity.add(this.gravity);
        if (this.position.y + this.height > this.groundLevel) {
            this.position.y = this.groundLevel - this.height;
            let velMagSq = this.velocity.magSq();
            if (velMagSq <= this.minVelocityMagSq) {
                this.isDead = true;
                return;
            }
            this.velocity.y *= -this.groundDampFactor;
            this.velocity.x *= this.groundDampFactor;
            if (velMagSq >= this.boneBreakingVelocityMagSq) {
                this.spriteIndex = Math.floor(Math.random() * this.__frames_hq.length);
            }
            if (velMagSq >= 15 ** 2) {
                this.in_jerk = true;
            }
            this.omega = this.velocity.x / 120;
        }
        this.rotation += this.omega;
        // this.position.x %= Math.floor(this.__ctx.canvas.width);
    }

    getTranslationVec() {
        return new Vector2D(this.position.x - this.origin.x, 0);
    }

    draw() {
        if (!this.visible) return;
        this.__drawKitten();
    }
    __drawKitten() {
        let frame = this.__frames_hq[this.spriteIndex];
        if (this.in_jerk) frame = this.__frames_lq[this.spriteIndex];
        let x = this.position.x;
        let y = this.position.y;
        let w = this.width;
        let h = this.height;
        if (x >= this.virtualPosXMax) x = this.virtualPosXMax;
        this.__ctx.save();
        this.__ctx.translate(x + w / 2, y + h / 2);
        this.__ctx.rotate(this.rotation);
        frame.draw(this.__ctx, -w / 2, -h / 2, w, h);
        this.__ctx.restore();
    }
}