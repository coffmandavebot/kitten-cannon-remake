//-[Imports]------------------------------------------
import { Vector2D } from "./Lib/Math/Vector2D.js";
import Sprite from "./Lib/Image/SpriteSheet.js";
import { $ } from "./utils.js";
import Grass from "./Game/Objects/Grass.js";
import Cannon from "./Game/Objects/Cannon.js";
import { KEYS, handleKeyboardCallbacks, registerKeyEventCallback } from "./Game/KeyboardController.js";
import Kitten from "./Game/Objects/Kitten.js";
import ObjectGenerator from "./Game/Objects/ObjectGenerator.js";
import ScoreBoard from "./Game/Objects/ScoreBoard.js";
import * as TouchController from "./Game/TouchController.js";
import RoundButton from "./Game/UI/RoundButton.js";
import HeightDisplay from "./Game/Objects/HeightDisplay.js";
import MenuScreen from "./Game/UI/Screens/MenuScreen.js";
import HowToPlayScreen from "./Game/UI/Screens/HowToPlayScreen.js";
import { linearMap, randomInt } from "./Lib/Math/functions.js";
import Creditscreen from "./Game/UI/Screens/CreditsScreen.js";
import Timer from "./Game/Timer.js";
import SoundManager from "./Game/SoundManager.js";
import Renderer from "./Lib/Renderer/Renderer.js";
import Camera2D from "./Lib/Camera2D/Camera2D.js";
import DistanceDisplay from "./Game/Objects/DistanceDisplay.js";
//-[/Imports]------------------------------------------

window.userId = userId || null; // userId comes from PHP
window.distance_travelled_px = 0;

async function main() {
    setup();
    canvas.style.display = "none";
    await preload();
    canvas.style.display = "block";
    gameLoop();
}
window.onload = main;


// disables console.log
console.log = () => { }


//-[Global Variables]------------------------------------------
// Most Important

let canvas, ctx;


// initialized in preload()
let sound_manager;
let screens_sprite;
let game_sprite;
let score_board;
let menu_screen;
let how_to_play_screen;
let credits_screen;

// general purpose (ownership unknown)
let highest_distance_travelled_px = 0;
let distance_travelled_px = 0;
let should_reset = false;
let max_skip_frames = 0;
let skip_frames = 0;
let globalHighScore = "0"; // Default global high score until fetched from server

let preload_message = "";
let preload_percentage = 0;

//// let bg = new Image();
//// bg.src = "ref_images/menu_screen.png";


// Constants
const GAME_SCREENS_E = {
    "Preload": 0b1,
    "Splash": 0b1 << 1,
    "Menu": 0b1 << 2,
    "Play": 0b1 << 3,
    "Help": 0b1 << 4,
    "Credits": 0b1 << 5,
};
const pixel_per_feet = 100;
const OBJECT_GAP = 800;
const TIME_SCALE = 60;

let CURRENT_GAME_SCREEN = GAME_SCREENS_E.Preload;

let timer;
let camera;
let renderer;

// in reset_game()
// Objects
let grass;
let cannon;
let kitty;
let objectGenerator;
//UIS
let fire_button;
let up_button;
let down_button;
let height_display;
let distance_display;

let highScoreFetched = false; // Add this flag at the top with other global variables

// Keep track of ongoing requests and last fetch time
let fetchingHighScore = false;
let lastFetchTime = 0;
const MIN_FETCH_INTERVAL = 2000; // minimum 2 seconds between fetches

// Add this variable to preserve the personal high score
let personalBestDisplay = "0";

//-[/Global Variables]------------------------------------------ 


function setup() {
    canvas = $("cnvs");
    canvas.width = 1040;
    canvas.height = 640;
    ctx = canvas.getContext("2d");
    resize();
}


async function preload() {
    sound_manager = new SoundManager();
    let proms = [];
    proms.push(new Promise(async (resolve, reject) => {
        game_sprite = await new Sprite("assets/sprite_sheet/kitty_cannon_dat").load();
        resolve();
    }));

    proms.push(new Promise(async (resolve, reject) => {
        screens_sprite = await new Sprite("assets/sprite_sheet/game_screens_dat").load();
        resolve();
    }));

    await Promise.all(proms);
    
    // Create scoreboard FIRST
    score_board = new ScoreBoard(ctx);
    
    // Load both global high score and personal best in parallel
    await Promise.all([
        fetchGlobalHighScore(),
        fetchPersonalHighScore()
    ]);

    menu_screen = new MenuScreen(ctx, screens_sprite, "Nicotine");
    how_to_play_screen = new HowToPlayScreen(ctx, screens_sprite, "Nicotine");
    credits_screen = new Creditscreen(ctx, screens_sprite, "Nicotine");

    highest_distance_travelled_px = 0;

    reset_game();

    set_events();
    add_sounds();
}


function reset_game() {
    timer = new Timer();
    camera = new Camera2D(canvas.width, canvas.height);
    renderer = new Renderer(ctx, camera);

    should_reset = false;
    score_board.visible = false;
    grass = new Grass(renderer, game_sprite);
    cannon = new Cannon(renderer, game_sprite, sound_manager);
    kitty = new Kitten(renderer, game_sprite, sound_manager);
    objectGenerator = new ObjectGenerator(renderer, game_sprite, kitty, OBJECT_GAP, sound_manager);
    height_display = new HeightDisplay(renderer, pixel_per_feet, "Nicotine");
    distance_display = new DistanceDisplay(renderer, pixel_per_feet, "Nicotine"); // Initialize the distance display

    camera.follow(new Vector2D(canvas.width / 2, canvas.height / 2), 1);

    // score reset
    distance_travelled_px = 0;
    add_button_events();
    timer.getTickS();
    
    // Fetch updated high scores at the start of each game
    fetchGlobalHighScore(0);
    
    highScoreFetched = false; // Reset the flag when starting a new game
}


function add_button_events() {

    // fire_button.onClick = (function () {
    //     throw_kitty();
    // });
    // up_button.onClick = (function () {
    //     cannon.barrelUp();
    // });
    // down_button.onClick = (function () {
    //     cannon.barrelDown();
    // });



    // score board
    score_board.onContinue = (async function () {
        should_reset = true;
    });
    score_board.onMenu = (async function () {
        CURRENT_GAME_SCREEN = GAME_SCREENS_E.Menu;
        max_skip_frames = skip_frames = 60;
    });


    menu_screen.onStartClick = function () {
        CURRENT_GAME_SCREEN = GAME_SCREENS_E.Play;
        max_skip_frames = skip_frames = 60;
    }
    menu_screen.onHelpClick = function () {
        CURRENT_GAME_SCREEN = GAME_SCREENS_E.Help;
        max_skip_frames = skip_frames = 60;
    }

    menu_screen.onCreditsClick = function () {
        CURRENT_GAME_SCREEN = GAME_SCREENS_E.Credits;
        max_skip_frames = skip_frames = 60;
    }

    how_to_play_screen.onBackClick = function () {
        CURRENT_GAME_SCREEN = GAME_SCREENS_E.Menu;
        max_skip_frames = skip_frames = 60;
    }

    credits_screen.onBackClick = function () {
        CURRENT_GAME_SCREEN = GAME_SCREENS_E.Menu;
        max_skip_frames = skip_frames = 60;
    }

}

function set_events() {
    registerKeyEventCallback(KEYS.w, () => {
        cannon.barrelUp();
    });
    registerKeyEventCallback(KEYS.arrowup, () => {
        cannon.barrelUp();
    });
    registerKeyEventCallback(KEYS.s, () => {
        cannon.barrelDown();
    });
    registerKeyEventCallback(KEYS.arrowdown, () => {
        cannon.barrelDown();
    });
    registerKeyEventCallback(KEYS.space, () => {
        throw_kitty();
    });
}


function add_sounds() {
    sound_manager.onLoad = (sound_name, progress_percentage) => {
        preload_message = "loaded sound " + sound_name;
        preload_percentage = progress_percentage;
    }

    sound_manager
        // .addSound("", "assets/audio_fx/1_whooshrev.m4a", 1.0)
        .addSound("after_load", "assets/audio_fx/2.m4a", 1.0)

        .addSound("hit1", "assets/audio_fx/5_hit1.m4a", 1.0)
        .addSound("hit2", "assets/audio_fx/4_hit2.m4a", 1.0)
        .addSound("hit3", "assets/audio_fx/3_hit3.m4a", 1.0)
        .addSound("hit4", "assets/audio_fx/2_hit4.m4a", 1.0)

        .addSound("cat1", "assets/audio_fx/12_cat1.m4a", 1.0)
        .addSound("cat2", "assets/audio_fx/11_cat2.m4a", 1.0)
        .addSound("cat3", "assets/audio_fx/10_cat3.m4a", 1.0)
        .addSound("cat4", "assets/audio_fx/9_cat4.m4a", 1.0)
        .addSound("cat5", "assets/audio_fx/8_cat5.m4a", 1.0)
        .addSound("cat6", "assets/audio_fx/7_cat6.m4a", 1.0)

        .addSound("tnt_blast", "assets/audio_fx/191.m4a", 1.0)
        .addSound("spike", "assets/audio_fx/203.m4a", 1.0)
        .addSound("swallow", "assets/audio_fx/222.m4a", 1.0)
        .addSound("trampoline", "assets/audio_fx/245.m4a", 1.0)
        .addSound("barrel", "assets/audio_fx/375.m4a", 1.0)
        .addSound("baloon_blast", "assets/audio_fx/378.m4a", 1.0)
        // .addSound("", "assets/audio_fx/311.m4a",1.0)
        // .addSound("", "assets/audio_fx/6_failure.m4a",1.0)
        .loadAll();
}


function gameLoop() {
    requestAnimationFrame(gameLoop);

    renderer.clear();

    if (skip_frames > 0) {
        skip_frames--;
        show_load_screen(skip_frames, max_skip_frames);
        return;
    }
    max_skip_frames = 0;
    skip_frames = 0;

    switch (CURRENT_GAME_SCREEN) {
        case GAME_SCREENS_E.Preload:
            preload_screen();
            break;
        case GAME_SCREENS_E.Splash:
            //splash_screen();
            break;
        case GAME_SCREENS_E.Menu:
            render_screen(menu_screen);
            break;
        case GAME_SCREENS_E.Credits:
            render_screen(credits_screen);
            break;
        case GAME_SCREENS_E.Help:
            render_screen(how_to_play_screen);
            break;
        case GAME_SCREENS_E.Play:
            render_game_screen();
            break;
    }

    // debug cursor position
    // let correct_pos = TouchController.map_coord_to_canvas(TouchController.TOUCH_INFORMATION.position, canvas);
    // ctx.fillStyle = "white";
    // ctx.strokeStyle = "black";
    // ctx.beginPath();
    // ctx.arc(correct_pos.x, correct_pos.y, 15, 0, Math.PI * 2);
    // ctx.closePath();
    // ctx.fill();
    // ctx.stroke();
}


//-[Screens]-------------------------------------------------
function show_load_screen(progress, max_progress) {
    ctx.fillStyle = "#dbedff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let frame = screens_sprite.getFrame("menu_screen.png");
    let frame_w = frame.getWidth();
    let frame_h = frame.getHeight();
    frame.draw(ctx, canvas.width / 2 - frame_w / 2, 0, frame_w, frame_h);
    let w = Math.floor(linearMap(progress, 0, max_progress, 0, canvas.width / 2));
    ctx.lineWidth = 2;
    ctx.fillStyle = "forestgreen";
    ctx.fillRect(canvas.width / 4 + 4, canvas.height / 2 + 4, w, 40);
    ctx.fillStyle = "lightgreen";
    ctx.fillRect(canvas.width / 4, canvas.height / 2, w, 40);
    ctx.fillStyle = "forestgreen";
    ctx.strokeRect(canvas.width / 4, canvas.height / 2, w, 40);
    ctx.font = "60px Nicotine";
    let text = "Loading ...";
    let font_w_half = ctx.measureText(text).width / 2;
    ctx.fillText(text, canvas.width / 2 - font_w_half, canvas.height / 2 + 100);
}

function preload_screen() {
    ctx.fillStyle = "#dbedff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    let frame = screens_sprite.getFrame("menu_screen.png");
    frame.draw(ctx, 0, 0, canvas.width, canvas.height);


    let arc_r = 80;
    let arc_pos = new Vector2D(canvas.width / 2, canvas.height - arc_r - 80);

    if (sound_manager.loaded) { // play button


        //play button background circle
        ctx.fillStyle = "#000";
        ctx.beginPath();
        ctx.arc(arc_pos.x, arc_pos.y, arc_r, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();

        //play button circle outline
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(arc_pos.x, arc_pos.y, arc_r - 4, 0, Math.PI * 2);
        ctx.closePath();
        ctx.stroke();

        // play Triangle

        ctx.fillStyle = "#FFF";
        ctx.save();

        let new_r = arc_r - 24;
        let eq_tri_vec = new Vector2D(-1, Math.sqrt(3)).scale((1 / 2) * (new_r));
        ctx.beginPath();
        ctx.translate(arc_pos.x, arc_pos.y);
        ctx.moveTo(new_r, 0);
        ctx.lineTo(eq_tri_vec.x, eq_tri_vec.y);
        ctx.lineTo(eq_tri_vec.x, -eq_tri_vec.y);
        ctx.closePath();
        ctx.fill();
        ctx.restore();



		CURRENT_GAME_SCREEN = GAME_SCREENS_E.Menu;
		cannon.resetBarrel();



    } else {

        ctx.fillStyle = "#000";
        ctx.font = "30px Nicotine";
        let progress_width = 200;
        let text_w = ctx.measureText(preload_message).width;
        ctx.fillText(preload_message, arc_pos.x - text_w / 2, arc_pos.y);


        ctx.fillStyle = "forestgreen";
        ctx.fillRect(arc_pos.x - progress_width / 2 + 8, arc_pos.y + 50 + 8, progress_width * (preload_percentage / 100), 40);
        ctx.fillStyle = "#c0c0c0";
        ctx.fillRect(arc_pos.x - progress_width / 2, arc_pos.y + 50, progress_width, 40);
        ctx.fillStyle = "lightgreen";
        ctx.fillRect(arc_pos.x - progress_width / 2, arc_pos.y + 50, progress_width * (preload_percentage / 100), 40);

    }

}

function splash_screen() {
    let dt = timer.getTickS() * TIME_SCALE;
    grass.draw();
    cannon.draw();
    cannon.update(dt);
    if (sound_manager.getCurrentTime("after_load") > 4.1) {
        cannon.barrelShoot();
    } else {
        if (sound_manager.getCurrentTime("after_load") > 3.1) cannon.barrelUp();
    }
}

function render_screen(screen_class) {
    screen_class.draw();
    if (TouchController.TOUCH_INFORMATION.eventType == TouchController.TOUCH_EVENT_TYPES.down) {
        let correct_pos = TouchController.map_coord_to_canvas(TouchController.TOUCH_INFORMATION.position, canvas);
        screen_class.updateClickInput(correct_pos);
        // Immediately reset the event type after processing
        TouchController.TOUCH_INFORMATION.eventType = TouchController.TOUCH_EVENT_TYPES.none;
    }
}

function render_game_screen() {
    // Add debug info here

               
    let dt = timer.getTickS();
    let fps = (1 / dt);
    ctx.font = "50px Nicotine";
    ctx.fillStyle = "#000";
    ctx.fillText("FPS : " + fps.toFixed(0), 30, 30);

    // if user gets window.onblur then the dt may be really high.
    // so we use Math.min
    dt = Math.min(dt, 1 / 20);
    dt *= TIME_SCALE;
    renderer.clear();
    handleKeyboardCallbacks();


    kitty.update(dt);
    height_display.updateWithKittenPosition(kitty.position);

    // Only update distance_travelled_px if kitty is alive and visible
    if (!(kitty.isDead) && kitty.visible) {
        distance_travelled_px += kitty.velocity.x * dt;
        distance_display.update(distance_travelled_px);
    }
    
    // Update the distance display with current distance - add this line


    let correct_pos = TouchController.map_coord_to_canvas(TouchController.TOUCH_INFORMATION.position, canvas);

    if (TouchController.TOUCH_INFORMATION.eventType == TouchController.TOUCH_EVENT_TYPES.down) {
        // Check if tap is on buttons first
        let buttonHit = false;
        try {
            console.log("Processing touch event");
            // First check if the tap hits any UI button
            // For score board, we need to check if it's visible AND if the tap hit it
            // When it's visible, we ONLY want to process score board interaction
            if (score_board.visible) {
                score_board.updateClickInput(correct_pos);
                // If score board is visible, don't process any other taps/clicks
                buttonHit = true; 
            } else {
                // Only check other buttons if score board isn't visible
                // if (fire_button.visible) {
                //     fire_button.updateClickInput(correct_pos);
                //     buttonHit = buttonHit || fire_button.isPointInside(correct_pos);
                // }
                
                // if (up_button.visible) {
                //     up_button.updateClickInput(correct_pos);
                //     buttonHit = buttonHit || up_button.isPointInside(correct_pos);
                // }
                
                // if (down_button.visible) {
                //     down_button.updateClickInput(correct_pos);
                //     buttonHit = buttonHit || down_button.isPointInside(correct_pos);
                // }
                
                // If no button was hit, handle as a firing tap
                if (!buttonHit && !kitty.visible && !kitty.isDead) {
                    aimAndFireAtPosition(correct_pos);
                }
            }
        } catch (e) {
            console.error("Error in touch handling:", e);
        } finally {
            // Immediately reset the event type after processing to prevent multiple processing
            TouchController.TOUCH_INFORMATION.eventType = TouchController.TOUCH_EVENT_TYPES.none;
        }
    }

    objectGenerator.update(dt);
    cannon.update(dt);


    if (kitty.position.x >= kitty.virtualPosXMax) {
        camera.follow(kitty.position.copy().subtract(new Vector2D(0, 0)), 0.5);
    } else {
        camera.follow(new Vector2D(canvas.width / 2, canvas.height / 2));
    }


    if (kitty.isDead) {
        handle_highScore();
        
        // Only fetch high score once when the kitten dies
        if (!highScoreFetched) {
            highScoreFetched = true;
            const finalScore = Math.floor(distance_travelled_px / pixel_per_feet);
            fetchGlobalHighScore(finalScore);
        }
        
        score_board.visible = true;
    }

    { // SCORE BOARD
        let distance_travelled = (distance_travelled_px / pixel_per_feet).toFixed(0);
        
        // Only update distance_travelled_px if kitty is alive and visible
        if (!(kitty.isDead) && kitty.visible) {
            distance_travelled_px += kitty.velocity.x * dt;
        }
        
        // If distance_travelled_px increased beyond highest_distance_travelled_px,
        // update highest_distance_travelled_px and personalBestDisplay
        if (distance_travelled_px > highest_distance_travelled_px) {
            highest_distance_travelled_px = distance_travelled_px;
            personalBestDisplay = (highest_distance_travelled_px / pixel_per_feet).toFixed(0);
        }
        
        // Make all score variables available globally
        window.distance_travelled_px = distance_travelled_px;
        window.distance_travelled = distance_travelled;
        window.gameScore = distance_travelled;
        
        // Update scores on scoreboard
        score_board.score = distance_travelled; 
        score_board.highScore = personalBestDisplay; // Use our persistent display value
        score_board.globalHighScore = globalHighScore;
        
        // Only use mock percentile if we don't have a server-provided one already
        if (score_board.percentile === 0 || score_board.percentile === undefined) {
            let mockPercentile = Math.min(99, Math.floor((distance_travelled / 2000) * 100));
            score_board.percentile = mockPercentile;
        }
        
        score_board.draw();
    }

    grass.draw();
    cannon.draw();
    kitty.draw();
    height_display.draw();
    distance_display.draw(); // Draw the distance display

    //fire_button.draw();
    //up_button.draw();
    //height_display.draw();
    //down_button.draw();

    objectGenerator.drawAll();


    if (should_reset) reset_game();
}


//-[/Screens]-------------------------------------------------

//-[Helpers]-------------------------------------------------

function hide_buttons() {
    // fire_button.visible = false;
    // up_button.visible = false;
    // down_button.visible = false;
}



function handle_highScore() {
    if (distance_travelled_px > highest_distance_travelled_px) {
        highest_distance_travelled_px = distance_travelled_px;
        personalBestDisplay = (highest_distance_travelled_px / pixel_per_feet).toFixed(0);
        
        // If this is a new personal best and the user is logged in,
        // you might want to submit it to the server and refresh the global high score
        if (window.userId) {
            submitScore(distance_travelled_px / pixel_per_feet);
            fetchGlobalHighScore(); // Refresh the global high score
        }
    }
}

// Optional: Add a function to submit scores
async function submitScore(score) {
    try {
        const data = new FormData();
        data.append('score', score);
        data.append('userId', window.userId);
        
        const response = await fetch('save_score.php', {
            method: 'POST',
            body: data
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // You could handle the response if needed
    } catch (e) {
        console.error('Error submitting score:', e);
    }
}

function throw_kitty() {
    if (!kitty.visible && !kitty.isDead) {
        // Don't hide UI elements when firing
        // Remove any hide_buttons() calls here
        
        cannon.barrelShoot();
        let barrelDir = cannon.getBarrelDirectionVector();
        kitty.visible = true;
        kitty.position = cannon.getBarrelEnd()
            .subtract(barrelDir.copy().scale(32))
            .subtract(new Vector2D(kitty.width / 2, kitty.height / 2));
        kitty.throw(barrelDir.scale((cannon.powerPercent / 100) * 46));

        if (Math.random() < 0.4) {
            sound_manager.play("cat" + randomInt(1, 6))
        }
        sound_manager.play("baloon_blast");
        
        // Debug message
        console.log("Kitten fired at angle:", cannon.barrel_angle, 
                   "power:", cannon.powerPercent);
    }
}

function aimAndFireAtPosition(position) {
    // Get cannon barrel start position - this is more accurate
    const cannonPos = cannon.getBarrelStart();
    
    // Calculate direction vector from cannon to tap position
    const aimDirection = position.copy().subtract(cannonPos);
    
    console.log("Tap position:", position.x, position.y);
    console.log("Cannon position:", cannonPos.x, cannonPos.y);
    console.log("Aim direction:", aimDirection.x, aimDirection.y);
    
    // Set cannon angle based on the direction vector
    cannon.aimAt(aimDirection);
    
    // Now fire the kitty
    throw_kitty();
}

async function fetchGlobalHighScore(optionalScore = null) {
    // Don't fetch if we're already fetching or if it's been less than MIN_FETCH_INTERVAL since last fetch
    if (fetchingHighScore || (Date.now() - lastFetchTime < MIN_FETCH_INTERVAL)) {
        console.log("High score fetch skipped - too frequent or already in progress");
        return;
    }
    
    try {
        fetchingHighScore = true;
        lastFetchTime = Date.now();
        
        // Rest of your existing code...
        const currentScore = optionalScore !== null ? 
            optionalScore : 
            Math.floor(distance_travelled_px / pixel_per_feet);
        
        console.log("Fetching high score for score:", currentScore);
        
        const response = await fetch(`get_high_score.php?score=${currentScore}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Update the global high score
        if (data && data.highScore) {
            globalHighScore = data.highScore;
            
            if (data.percentile !== undefined && score_board) {
                score_board.percentile = data.percentile;
            }
        }
    } catch (e) {
        console.error('Error fetching global high score:', e);
    } finally {
        // Always reset the fetching flag when done
        fetchingHighScore = false;
    }
}

// Modify fetchPersonalHighScore to save the display value
async function fetchPersonalHighScore() {
    if (!window.userId) {
        console.log("No user ID, skipping personal high score fetch");
        return;
    }
    
    try {
        console.error("Fetching personal best for user:", window.userId);
        const response = await fetch(`get_personal_high_score.php?userId=${window.userId}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.personalHighScore) {
            console.error("Personal best retrieved:", data.personalHighScore);
            
            // Store the display value
            personalBestDisplay = data.personalHighScore;
            
            // Convert feet (from DB) to pixels (game uses pixels internally)
            const highScoreInPixels = parseInt(data.personalHighScore) * pixel_per_feet;
            
            // Update the game's high score variable
            highest_distance_travelled_px = Math.max(highest_distance_travelled_px, highScoreInPixels);
        }
        else {
            console.error("Could not retrieve personal best.");
        }
    } catch (e) {
        console.error('Error fetching personal high score:', e);
    }
}

addEventListener("click", goFullScreen);

function goFullScreen() {
    if ("requestFullscreen" in document.body) {
        document.body.requestFullscreen().catch(err => {
            console.log("no full screen support");
        });
    }
    if ('wakelock' in navigator) {
        navigator.wakeLock.request('screen').then(() => {
            console.log("wakelock aquired");
        }).catch(err => {
            console.log("failed aquiring wakelock");
        });
    }
}
function resize() {
    if (canvas) {
        TouchController.resetTouchInfo();

        let canvas_ar = canvas.width / canvas.height;
        let portrait_width = canvas_ar * innerHeight;
        if (portrait_width < innerWidth) {
            canvas.style.width = 'auto';
            canvas.style.height = '100vh';
        } else {
            canvas.style.width = '100vw';
            canvas.style.height = 'auto';
            portrait_width = innerWidth;
        }
        canvas.classList.remove('landscape');


        let landscape_width = canvas_ar * innerWidth;
        if (landscape_width < innerHeight) {
            if (landscape_width > portrait_width) {
                canvas.style.height = '100vw';
                canvas.style.width = 'auto';
                canvas.classList.add('landscape');
            }
        } else {
            landscape_width = innerHeight;
            if (landscape_width > portrait_width) {
                canvas.style.height = 'auto';
                canvas.style.width = '100vh';
                canvas.classList.add('landscape');
            }
        }
    }
}

onresize = resize;
//-[/Helpers]-------------------------------------------------