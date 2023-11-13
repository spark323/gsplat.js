import type { Camera } from "../cameras/Camera";
import { Matrix3 } from "../math/Matrix3";
import { Quaternion } from "../math/Quaternion";
import { Vector3 } from "../math/Vector3";

class OrbitControls {
    minAngle: number = -90;
    maxAngle: number = 90;
    minZoom: number = 0.1;
    maxZoom: number = 30;
    orbitSpeed: number = 1;
    panSpeed: number = 1;
    zoomSpeed: number = 1;
    dampening: number = 0.12;
    domElement: HTMLElement;

    protected enableKeyboardControls: boolean = true;
    protected dragging = false;
    protected panning = false;
    protected lastDist = 0;
    protected lastX = 0;
    protected lastY = 0;


    public attach = (newCamera: Camera) => {
        if (this.camera) {
            this.detach();
        }
        this.camera = newCamera;
        this.camera.addEventListener("change", this.onCameraChange);
    };
    public detach = () => {
        if (!this.camera) return;

        this.camera.removeEventListener("change", this.onCameraChange);
        this.camera = null;
    }
    public setCameraTarget = (newTarget: Vector3) => {
        if (!this.camera) return;
        const dx = newTarget.x - this.camera.position.x;
        const dy = newTarget.y - this.camera.position.y;
        const dz = newTarget.z - this.camera.position.z;
        this.desiredRadius = Math.sqrt(dx * dx + dy * dy + dz * dz);
        this.desiredBeta = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
        this.desiredAlpha = -Math.atan2(dx, dz);
        this.desiredTarget.set(newTarget.x, newTarget.y, newTarget.z);
    };

    protected dispose() {
        this.domElement.removeEventListener("dragenter", this.preventDefault);
        this.domElement.removeEventListener("dragover", this.preventDefault);
        this.domElement.removeEventListener("dragleave", this.preventDefault);
        this.domElement.removeEventListener("contextmenu", this.preventDefault);

        this.domElement.removeEventListener("mousedown", this.onMouseDown);
        this.domElement.removeEventListener("mousemove", this.onMouseMove);
        this.domElement.removeEventListener("wheel", this.onWheel);

        this.domElement.removeEventListener("touchstart", this.onTouchStart);
        this.domElement.removeEventListener("touchend", this.onTouchEnd);
        this.domElement.removeEventListener("touchmove", this.onTouchMove);

        if (this.enableKeyboardControls) {
            window.removeEventListener("keydown", this.onKeyDown);
            window.removeEventListener("keyup", this.onKeyUp);
        }
    };
    protected keys: { [key: string]: boolean } = {};

    protected desiredTarget: Vector3;
    protected target: Vector3;
    protected desiredAlpha: number;
    protected alpha: number;
    protected desiredBeta: number;
    protected beta: number;
    protected desiredRadius: number;
    protected radius: number;
    protected camera: Camera | null = null;
    private isUpdatingCamera = false;

    protected onCameraChange = () => {
        if (!this.camera || this.isUpdatingCamera) return;

        const eulerRotation = this.camera.rotation.toEuler();
        this.desiredAlpha = -eulerRotation.y;
        this.desiredBeta = -eulerRotation.x;

        const x = this.camera.position.x - this.desiredRadius * Math.sin(this.desiredAlpha) * Math.cos(this.desiredBeta);
        const y = this.camera.position.y + this.desiredRadius * Math.sin(this.desiredBeta);
        const z = this.camera.position.z + this.desiredRadius * Math.cos(this.desiredAlpha) * Math.cos(this.desiredBeta);

        this.desiredTarget = new Vector3(x, y, z);
    };
    protected computeZoomNorm = () => {
        return 0.1 + (0.9 * (this.desiredRadius - this.minZoom)) / (this.maxZoom - this.minZoom);
    };
    protected lerp = (a: number, b: number, t: number) => {
        return (1 - t) * a + t * b;
    };

    protected preventDefault = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
    };

    protected onKeyUp = (e: KeyboardEvent) => {
        this.keys[e.code] = false; // Map arrow keys to WASD keys
        if (e.code === "ArrowUp") this.keys["KeyW"] = false;
        if (e.code === "ArrowDown") this.keys["KeyS"] = false;
        if (e.code === "ArrowLeft") this.keys["KeyA"] = false;
        if (e.code === "ArrowRight") this.keys["KeyD"] = false;
    };
    protected onKeyDown = (e: KeyboardEvent) => {
        this.keys[e.code] = true;
        // Map arrow keys to WASD keys
        if (e.code === "ArrowUp") this.keys["KeyW"] = true;
        if (e.code === "ArrowDown") this.keys["KeyS"] = true;
        if (e.code === "ArrowLeft") this.keys["KeyA"] = true;
        if (e.code === "ArrowRight") this.keys["KeyD"] = true;
    };
    protected onMouseDown = (e: MouseEvent) => {
        this.preventDefault(e);
        this.dragging = true;
        this.panning = e.button === 2;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        window.addEventListener("mouseup", this.onMouseUp);
    };
    protected onMouseUp = (e: MouseEvent) => {
        this.preventDefault(e);
        this.dragging = false;
        this.panning = false;
        window.removeEventListener("mouseup", this.onMouseUp);
    };
    protected onMouseMove = (e: MouseEvent) => {
        this.preventDefault(e);

        if (!this.dragging || !this.camera) return;

        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;

        if (this.panning) {
            const zoomNorm = this.computeZoomNorm();
            const panX = -dx * this.panSpeed * 0.01 * zoomNorm;
            const panY = -dy * this.panSpeed * 0.01 * zoomNorm;
            const R = Matrix3.RotationFromQuaternion(this.camera.rotation).buffer;
            const right = new Vector3(R[0], R[3], R[6]);
            const up = new Vector3(R[1], R[4], R[7]);
            this.desiredTarget = this.desiredTarget.add(right.multiply(panX));
            this.desiredTarget = this.desiredTarget.add(up.multiply(panY));
        } else {
            this.desiredAlpha -= dx * this.orbitSpeed * 0.003;
            this.desiredBeta += dy * this.orbitSpeed * 0.003;
            this.desiredBeta = Math.min(
                Math.max(this.desiredBeta, (this.minAngle * Math.PI) / 180),
                (this.maxAngle * Math.PI) / 180,
            );
        }

        this.lastX = e.clientX;
        this.lastY = e.clientY;
    };
    protected onWheel = (e: WheelEvent) => {
        this.preventDefault(e);

        const zoomNorm = this.computeZoomNorm();
        this.desiredRadius += e.deltaY * this.zoomSpeed * 0.025 * zoomNorm;
        this.desiredRadius = Math.min(Math.max(this.desiredRadius, this.minZoom), this.maxZoom);

    };

    protected onTouchStart = (e: TouchEvent) => {
        this.preventDefault(e);

        if (e.touches.length === 1) {
            this.dragging = true;
            this.panning = false;
            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
            this.lastDist = 0;
        } else if (e.touches.length === 2) {
            this.dragging = true;
            this.panning = true;
            this.lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            this.lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const distX = e.touches[0].clientX - e.touches[1].clientX;
            const distY = e.touches[0].clientY - e.touches[1].clientY;
            this.lastDist = Math.sqrt(distX * distX + distY * distY);
        }
    };
    protected onTouchEnd = (e: TouchEvent) => {
        this.preventDefault(e);
        this.dragging = false;
        this.panning = false;
    };
    protected onTouchMove = (e: TouchEvent) => {
        this.preventDefault(e);

        if (!this.dragging || !this.camera) return;

        if (this.panning) {
            const zoomNorm = this.computeZoomNorm();

            const distX = e.touches[0].clientX - e.touches[1].clientX;
            const distY = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.sqrt(distX * distX + distY * distY);
            const delta = this.lastDist - dist;
            this.desiredRadius += delta * this.zoomSpeed * 0.1 * zoomNorm;
            this.desiredRadius = Math.min(Math.max(this.desiredRadius, this.minZoom), this.maxZoom);
            this.lastDist = dist;

            const touchX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const touchY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const dx = touchX - this.lastX;
            const dy = touchY - this.lastY;
            const R = Matrix3.RotationFromQuaternion(this.camera.rotation).buffer;
            const right = new Vector3(R[0], R[3], R[6]);
            const up = new Vector3(R[1], R[4], R[7]);
            this.desiredTarget = this.desiredTarget.add(right.multiply(-dx * this.panSpeed * 0.025 * zoomNorm));
            this.desiredTarget = this.desiredTarget.add(up.multiply(-dy * this.panSpeed * 0.025 * zoomNorm));
            this.lastX = touchX;
            this.lastY = touchY;
        } else {
            const dx = e.touches[0].clientX - this.lastX;
            const dy = e.touches[0].clientY - this.lastY;

            this.desiredAlpha -= dx * this.orbitSpeed * 0.003;
            this.desiredBeta += dy * this.orbitSpeed * 0.003;
            this.desiredBeta = Math.min(
                Math.max(this.desiredBeta, (this.minAngle * Math.PI) / 180),
                (this.maxAngle * Math.PI) / 180,
            );

            this.lastX = e.touches[0].clientX;
            this.lastY = e.touches[0].clientY;
        }
    };
    protected update() {
        if (!this.camera) return;

        this.isUpdatingCamera = true;

        this.alpha = this.lerp(this.alpha, this.desiredAlpha, this.dampening);
        this.beta = this.lerp(this.beta, this.desiredBeta, this.dampening);
        this.radius = this.lerp(this.radius, this.desiredRadius, this.dampening);
        this.target = this.target.lerp(this.desiredTarget, this.dampening);

        const x = this.target.x + this.radius * Math.sin(this.alpha) * Math.cos(this.beta);
        const y = this.target.y - this.radius * Math.sin(this.beta);
        const z = this.target.z - this.radius * Math.cos(this.alpha) * Math.cos(this.beta);
        this.camera.position.set(x, y, z);

        const direction = this.target.subtract(this.camera.position).normalize();
        const rx = Math.asin(-direction.y);
        const ry = Math.atan2(direction.x, direction.z);
        this.camera.rotation = Quaternion.FromEuler(new Vector3(rx, ry, 0));

        // Just spit balling here on the values
        const moveSpeed = 0.025;
        const rotateSpeed = 0.01;

        const R = Matrix3.RotationFromQuaternion(this.camera.rotation).buffer;
        const forward = new Vector3(-R[2], -R[5], -R[8]);
        const right = new Vector3(R[0], R[3], R[6]);

        if (this.keys["KeyS"]) this.desiredTarget = this.desiredTarget.add(forward.multiply(moveSpeed));
        if (this.keys["KeyW"]) this.desiredTarget = this.desiredTarget.subtract(forward.multiply(moveSpeed));
        if (this.keys["KeyA"]) this.desiredTarget = this.desiredTarget.subtract(right.multiply(moveSpeed));
        if (this.keys["KeyD"]) this.desiredTarget = this.desiredTarget.add(right.multiply(moveSpeed));

        // Add rotation with 'e' and 'q' for horizontal rotation
        if (this.keys["KeyE"]) this.desiredAlpha += rotateSpeed;
        if (this.keys["KeyQ"]) this.desiredAlpha -= rotateSpeed;

        // Add rotation with 'r' and 'f' for vertical rotation
        if (this.keys["KeyR"]) this.desiredBeta += rotateSpeed;
        if (this.keys["KeyF"]) this.desiredBeta -= rotateSpeed;

        this.isUpdatingCamera = false;
    };
    protected initialize = () => {
        if (this.enableKeyboardControls) {
            window.addEventListener("keydown", this.onKeyDown);
            window.addEventListener("keyup", this.onKeyUp);
        }

        this.domElement.addEventListener("dragenter", this.preventDefault);
        this.domElement.addEventListener("dragover", this.preventDefault);
        this.domElement.addEventListener("dragleave", this.preventDefault);
        this.domElement.addEventListener("contextmenu", this.preventDefault);

        this.domElement.addEventListener("mousedown", this.onMouseDown);
        this.domElement.addEventListener("mousemove", this.onMouseMove);
        this.domElement.addEventListener("wheel", this.onWheel);

        this.domElement.addEventListener("touchstart", this.onTouchStart);
        this.domElement.addEventListener("touchend", this.onTouchEnd);
        this.domElement.addEventListener("touchmove", this.onTouchMove);

    }
    constructor(
        inputCamera: Camera,
        domElement: HTMLElement,
        alpha: number = 0.5,
        beta: number = 0.5,
        radius: number = 5,
        enableKeyboardControls: boolean = true,
        inputTarget: Vector3 = new Vector3(),
    ) {
        this.domElement = domElement;
        this.target = inputTarget.clone();
        this.desiredTarget = this.target.clone();
        this.enableKeyboardControls = enableKeyboardControls;


        this.alpha = alpha;
        this.desiredAlpha = alpha;
        this.beta = beta;
        this.desiredBeta = beta;
        this.radius = radius;
        this.desiredRadius = radius;







        this.attach(inputCamera);
    }
}

export { OrbitControls };
