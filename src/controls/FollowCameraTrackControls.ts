import type { Camera } from "../cameras/Camera";
import { Matrix3 } from "../math/Matrix3";
import { Quaternion } from "../math/Quaternion";
import { Vector3 } from "../math/Vector3";
import { OrbitControls } from "./OrbitControls";
class FollowCameraTrackControls extends OrbitControls {

    private animationStarted = false;
    private isAnimationPasued = false;
    private resumeAnimationOnInputHandler: any = null;

    private animationLogicHandler: any;
    private animationLogicConfig: any = {
        shouldPauseAnimationOnInput: true,
        pausePeriodOnInput: 3000,
    }
    public setAnimationLogic(animationLogicConfig: any) {

        this.animationLogicConfig = Object.assign(this.animationLogicConfig, animationLogicConfig)
    }
    public startAnimation: () => void = () => {
        this.stopAnimation();
        this.animationStarted = true;
        if (!this.animationLogicConfig.animationLogicFunction) {
            return;
        }
        if (this.animationLogicConfig.initialRadius) {
            this.desiredRadius = this.animationLogicConfig.initialRadius;
        }
        if (this.animationLogicConfig.initialTarget) {
            this.setCameraTarget(this.animationLogicConfig.initialTarget);

        }
        this.animationLogicHandler = setInterval(() => {
            if (this.isAnimationPasued) { return; }
            this.animationLogicConfig.animationLogicFunction(this);
        }, this.animationLogicConfig.animationLogicInterval);

    };
    public pauseAnimation: () => void = () => {
        this.isAnimationPasued = true;
    };
    public stopAnimation = () => {
        if (this.animationLogicHandler) {
            clearInterval(this.animationLogicHandler);
            this.animationLogicHandler = null;
        }
        this.animationStarted = false;
    }
    private resumeAnimationOnInput = () => {
        if (!this.animationLogicHandler)
            return
        if (this.resumeAnimationOnInputHandler) {
            clearTimeout(this.resumeAnimationOnInputHandler);
        }
        this.resumeAnimationOnInputHandler = setTimeout(() => {
            if (this.animationLogicConfig.initialTarget) {
                this.setCameraTarget(this.animationLogicConfig.initialTarget);
            }
            this.isAnimationPasued = false;
        }, (this.animationLogicConfig.pausePeriodOnInput));
    }
    private pauseAnimationOnInput: () => void = () => {
        this.isAnimationPasued = true;
    };

    protected onKeyDownNew = (e: KeyboardEvent) => {
        this.onKeyDown(e);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.pauseAnimationOnInput();
        }
    };
    protected onKeyUpNew = (e: KeyboardEvent) => {
        this.onKeyUp(e);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            if (!(this.keys["KeyW"] || this.keys["KeyS"] || this.keys["KeyA"] || this.keys["KeyD"])) {
                this.resumeAnimationOnInput();
            }

        }
    };
    protected onMouseUpNew = (e: MouseEvent) => {

        this.onMouseUp(e);
        window.addEventListener("mouseup", this.onMouseUpNew);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.resumeAnimationOnInput();
        }
    }
    protected onMouseDownNew = (e: MouseEvent) => {
        this.onMouseDown(e);
        window.removeEventListener("mouseup", this.onMouseUp);
        window.addEventListener("mouseup", this.onMouseUpNew);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.pauseAnimationOnInput();
        }
    }
    protected onWheelNew = (e: WheelEvent) => {

        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.pauseAnimationOnInput();
        }
        this.onWheel(e);

        //console.log("this.desiredRadius", this.desiredRadius);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.resumeAnimationOnInput();
        }
    }
    protected onTouchStartNew = (e: TouchEvent) => {
        this.onTouchStart(e);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.pauseAnimationOnInput();
        }
    }
    protected onTouchEndNew = (e: TouchEvent) => {
        this.onTouchEnd(e);
        if (this.animationStarted && this.animationLogicConfig.shouldPauseAnimationOnInput) {
            this.resumeAnimationOnInput();
        }
    }
    protected initilize = (e: TouchEvent) => {

    }
    public setCameraPosition = (position: Vector3, target: Vector3) => {
        if (!this.camera) {
            return;
        }
        let newTarget = (target) ? target.clone() : this.desiredTarget.clone();
        this.camera.position = position.clone();

        let dx = newTarget.x - position.x;
        let dy = newTarget.y - position.y;
        let dz = newTarget.z - position.z;

        this.desiredAlpha = -Math.atan2(dx, dz);
        this.desiredBeta = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
        this.desiredRadius = Math.sqrt(dx * dx + dy * dy + dz * dz);



        this.desiredTarget.set(newTarget.x, newTarget.y, newTarget.z);


    }
    protected update = () => {
        super.update();
        // console.log(this.desiredTarget + "," + this.desiredRadius + "," + this.desiredAlpha + "," + this.desiredBeta)

    }
    public getStatus() {
        return {
            desiredAlpha: this.desiredAlpha, desiredBeta: this.desiredBeta, desiredRadius: this.desiredRadius, desiredTarget: {
                x: this.desiredTarget.x,
                y: this.desiredTarget.y,
                z: this.desiredTarget.z
            }
        }
    }
    constructor(
        inputCamera: Camera,
        domElement: HTMLElement,
        alpha: number = 0.5,
        beta: number = 0.5,
        radius: number = 5,
        enableKeyboardControls: boolean = true,
        inputTarget: Vector3 = new Vector3()
    ) {
        super(inputCamera, domElement, alpha, beta, radius, enableKeyboardControls, inputTarget);

        super.dispose();
        if (enableKeyboardControls) {
            window.addEventListener("keydown", this.onKeyDownNew);
            window.addEventListener("keyup", this.onKeyUpNew);
        }

        domElement.addEventListener("dragenter", this.preventDefault);
        domElement.addEventListener("dragover", this.preventDefault);
        domElement.addEventListener("dragleave", this.preventDefault);
        domElement.addEventListener("contextmenu", this.preventDefault);

        domElement.addEventListener("mousedown", this.onMouseDownNew);
        domElement.addEventListener("mousemove", this.onMouseMove);
        domElement.addEventListener("wheel", this.onWheelNew);

        domElement.addEventListener("touchstart", this.onTouchStartNew);
        domElement.addEventListener("touchend", this.onTouchEndNew);
        domElement.addEventListener("touchmove", this.onTouchMove);


    }



}

export { FollowCameraTrackControls };
