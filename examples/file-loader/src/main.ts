import * as SPLAT from "gsplat";

const renderer = new SPLAT.WebGLRenderer();
const scene = new SPLAT.Scene();
const camera = new SPLAT.Camera();
const controls = new SPLAT.OrbitControls(camera, renderer.domElement);

let loading = false;

async function selectFile(file: File) {
    if (loading) return;
    loading = true;
    // Check if .splat file
    if (file.name.endsWith(".splat")) {
        await SPLAT.Loader.LoadFromFileAsync(file, scene, (progress: number) => {
            console.log("Loading SPLAT file: " + progress);
        });
    } else if (file.name.endsWith(".ply")) {
        await SPLAT.PLYLoader.LoadFromFileAsync(file, scene, (progress: number) => {
            console.log("Loading PLY file: " + progress);
        });
    }
    loading = false;
}

async function main() {
    // Load a placeholder scene
    const url = "https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat";
    await SPLAT.Loader.LoadAsync(url, scene, () => {});

    // Render loop
    const frame = () => {
        controls.update();
        renderer.render(scene, camera);

        requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);

    // Listen for file drops
    document.addEventListener("drop", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.dataTransfer != null) {
            selectFile(e.dataTransfer.files[0]);
        }
    });
}

main();
