import * as THREE from "three"
import { GLTFLoader} from "three/addons/loaders/GLTFLoader.js"

const canvas = document.getElementById("miniCanvas")
/*
 * SCENE
 */
const scene = new THREE.Scene()

/*
 * CAMERA
 */
const camera = new THREE.PerspectiveCamera(35, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
camera.position.set(0, 0, 6)
camera.lookAt(0, 0, 0)

/*
 * RENDERER
 */
const renderer =new THREE.WebGLRenderer({canvas: canvas, alpha: true, antialias: true})
renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
/* Stops unnecessarily huge rendering on high-DPI screens */
renderer.setPixelRatio( Math.min(window.devicePixelRatio, 1.5))
/* Keep the Three.js background transparent */
renderer.setClearColor(0x000000, 0)

/*
 * LIGHTING
 */

const ambientLight = new THREE.AmbientLight( 0xffffff, 2.5)
scene.add(ambientLight)
const frontLight = new THREE.DirectionalLight( 0xffffff, 4)
frontLight.position.set( 5, 4, 6)
scene.add(frontLight)
const backLight = new THREE.DirectionalLight( 0xffffff, 2)
backLight.position.set( -4, 2, -4)
scene.add(backLight)

/*
 * This group acts as a pivot around the MINI.
 * We rotate this rather than messing with the GLB itself.
 */

const carPivot = new THREE.Group()
scene.add(carPivot)
carPivot.position.x = -0
carPivot.position.y = 0.25

/*
 * LOAD MINI
 */

const loader = new GLTFLoader()
loader.load("./assets/models/minijcw.glb",
    function(gltf) {
        const car = gltf.scene

        /*
         * Determine the model's size so different GLB files
         * aren't ridiculously huge or tiny.
         */

        const originalBox = new THREE.Box3().setFromObject(car)
        const originalSize = originalBox.getSize( new THREE.Vector3() )
        const largestDimension = Math.max( originalSize.x, originalSize.y, originalSize.z)

        /*
         * Automatically scale the car to a sensible size.
         */

        const desiredSize = 4
        const scale = desiredSize / largestDimension
        car.scale.setScalar(scale)


        /*
         * Recalculate its centre after scaling.
         */

        const box = new THREE.Box3().setFromObject(car)
        const centre = box.getCenter(new THREE.Vector3() )


        /*
         * Put the centre of the MINI at 0,0,0.
         * This makes cursor rotation look natural.
         */

        car.position.x -= centre.x
        car.position.y -= centre.y
        car.position.z -= centre.z

        carPivot.add(car)
    },

    undefined,

    function(error) {
        console.error( "Could not load MINI model:", error)
    }
)

/*
 * CURSOR MOVEMENT
 */

let targetRotationX = 0
let targetRotationY = 0

const baseRotationY = Math.PI / 3     // 60 degrees to the left
const baseRotationX = Math.PI / 12    // 15 degrees downward


window.addEventListener(
    "pointermove",
    function(event) {
        /*
         * Convert mouse coordinates to:
         *
         * -1 = left/top
         *  0 = centre
         * +1 = right/bottom
         */
        const mouseX = (event.clientX / window.innerWidth) * 2 - 1
        const mouseY = (event.clientY / window.innerHeight) * 2 - 1

        /*
         * Only allow a small amount of rotation.
         */

        targetRotationY = mouseX * 0.22
        targetRotationX = mouseY * 0.06
    }
)


/*
 * Return to the centre when the cursor leaves the page.
 */

document.addEventListener(
    "mouseleave",
    function() {
        targetRotationX = 0
        targetRotationY = 0
    }
)



function animate() {
    requestAnimationFrame(animate)
    /*
     * Smoothly approach the cursor position rather
     * than instantly snapping toward it.
     */
    carPivot.rotation.y += ((baseRotationY + targetRotationY) - carPivot.rotation.y) * 0.04
    carPivot.rotation.x += ((baseRotationX + targetRotationX) - carPivot.rotation.x) * 0.04
    renderer.render( scene, camera)
}


animate()


/*
 * WINDOW RESIZING
 */

function resizeScene() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    renderer.setSize( width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    updateCameraDistance()
}


function updateCameraDistance() {
    const aspect = canvas.clientWidth / canvas.clientHeight
    if (aspect < 0.8) {
        // Portrait phone
        camera.position.z = 8
    } else if (aspect < 1.2) {
        // Tablet / squarer screen
        camera.position.z = 7
    } else {
        // Laptop / desktop
        camera.position.z = 6
    }
    camera.lookAt(0, 0, 0)
}

window.addEventListener("resize", resizeScene)
resizeScene()